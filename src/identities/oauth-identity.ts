import { EventEmitter } from "events";
import queryString from "query-string";
import StrictEventEmitter from "strict-event-emitter-types";

import {
    IdentityMechanism,
    IdentityMechanismEvents,
    QueuedRequest,
    OAuthIdentityConfiguration,
    HttpMethods,
    OAuthResponseDto
} from "../contracts";

const IdentityEventEmitter: { new (): StrictEventEmitter<EventEmitter, IdentityMechanismEvents> } = EventEmitter;
export class OAuthIdentity extends IdentityEventEmitter implements IdentityMechanism {
    constructor(protected readonly configuration: OAuthIdentityConfiguration) {
        super();
    }

    private loginData: OAuthResponseDto | undefined;
    private renewalTimeoutId: number | undefined;
    /**
     * Value is set in seconds.
     */
    private timeBeforeExpires: number = 120;

    public async login(username: string, password: string): Promise<void> {
        const requestUrl = `${this.configuration.host}${this.configuration.loginPath}`;

        const response = await fetch(requestUrl, {
            method: HttpMethods.POST,
            headers: { ...(this.configuration.headers || {}) },
            body: queryString.stringify({
                // Reference: https://tools.ietf.org/html/rfc6749#section-4.3.2
                grant_type: "password",
                username: username,
                password: password
            })
        });

        const responseStatus = `${response.status}`[0];
        if (responseStatus !== "2") {
            throw new Error("Authentication failed.");
        }

        this.emit("login");
        this.setLoginData((await response.json()) as OAuthResponseDto);
    }

    public async logout(): Promise<void> {
        if (this.loginData == null) {
            throw new Error("Identity: login data is not set yet.");
        }

        const requestUrl = `${this.configuration.host}${this.configuration.logoutPath}`;

        const response = await fetch(requestUrl, {
            method: HttpMethods.POST,
            headers: { ...(this.configuration.headers || {}) },
            body: queryString.stringify({
                grant_type: "refresh_token",
                refresh_token: this.loginData.refresh_token
            })
        });

        const responseStatus = `${response.status}`[0];
        if (responseStatus !== "2") {
            throw new Error("Failed to logout.");
        }
        this.loginData = undefined;
        clearTimeout(this.renewalTimeoutId);
        this.emit("logout");
    }

    public async authenticateRequest(request: QueuedRequest): Promise<QueuedRequest> {
        if (this.loginData == null) {
            throw new Error("Identity: login data is not set yet.");
        }

        if (request.isAuthenticated == null || request.isAuthenticated === false) {
            return request;
        }

        const authHeader: { [index: string]: string } = {
            Authorization: `${this.loginData.token_type} ${this.loginData.access_token}`
        };

        request.headers = {
            ...request.headers,
            ...authHeader
        };

        return request;
    }

    private async renewToken(refreshToken: string): Promise<void> {
        const requestUrl = `${this.configuration.host}${this.configuration.loginPath}`;

        const response = await fetch(requestUrl, {
            method: HttpMethods.POST,
            headers: { ...(this.configuration.headers || {}) },
            body: queryString.stringify({
                // Reference: https://tools.ietf.org/html/rfc6749#section-2.3.1
                grant_type: "refresh_token",
                refresh_token: refreshToken
            })
        });

        const responseStatus = `${response.status}`[0];
        if (responseStatus !== "2") {
            throw new Error("Failed renew token.");
        }

        this.setLoginData((await response.json()) as OAuthResponseDto);
    }

    private setLoginData(loginData: OAuthResponseDto): void {
        if (loginData.expires_in == null) {
            throw Error("Not supported without expiration time.");
        }

        this.loginData = loginData;

        // If response do not have `refresh_token` we are not using renewal mechanism.
        if (loginData.refresh_token == null) {
            return;
        }

        const refreshToken = loginData.refresh_token;

        // If response has `refresh_token` but we do not want to use renewal mechanism.
        if (this.configuration.tokenRenewalEnabled === false) {
            return;
        }

        if (this.renewalTimeoutId != null) {
            clearTimeout(this.renewalTimeoutId);
            this.renewalTimeoutId = undefined;
        }

        const timeoutNumber = this.renewalTime(loginData.expires_in);
        this.renewalTimeoutId = window.setTimeout(() => this.renewToken(refreshToken), timeoutNumber);
    }

    private renewalTime(time: number): number {
        let renewTime: number = this.timeBeforeExpires;

        if (this.configuration.renewTokenTime != null) {
            if (typeof this.configuration.renewTokenTime === "number") {
                renewTime = this.configuration.renewTokenTime;
            } else {
                renewTime = this.configuration.renewTokenTime(time);
            }
        }

        let timeoutTime = time - renewTime;

        if (renewTime > time) {
            timeoutTime = time;
        }

        return timeoutTime;
    }
}
