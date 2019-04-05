import { StrictEventEmitter } from "strict-event-emitter-types";

export interface EventEmitterLike {
    // tslint:disable-next-line:no-any
    addListener(event: string | symbol, listener: (...args: any[]) => void): this;
    // tslint:disable-next-line:no-any
    removeListener(event: string | symbol, listener: (...args: any[]) => void): this;
    // tslint:disable-next-line:no-any
    emit(event: string | symbol, ...args: any[]): boolean;
}

export interface IdentityMechanismEvents {
    logout: () => Promise<void>;
    login: () => Promise<void>;
}

export interface IdentityMechanism extends StrictEventEmitter<EventEmitterLike, IdentityMechanismEvents> {
    logout(): Promise<void>;
    authenticateRequest(request: QueuedRequest): Promise<QueuedRequest>;
}

export interface ApiConfiguration {
    host: string;
    path?: string;
    defaultHeaders?: { [index: string]: string };
    defaultAuthRequired?: boolean;
    identity?: IdentityMechanism;
    defaultQueryParams?: QueryParams;
    requestQueueLimit?: number;
}

export type QueryParams = { [key: string]: string | number | Array<string | number> };

export enum HttpMethods {
    GET = "GET",
    POST = "POST",
    PUT = "PUT",
    DELETE = "DELETE",
    PATCH = "PATCH"
}

// #region Request types
export interface RequestMethod<TMethod extends HttpMethods> {
    method: TMethod;
}

export interface BaseApiRequest<TBody = {}> {
    requestPath: string;
    body?: TBody;
    headers?: { [index: string]: string };
    // Is request authenticated.
    isAuthenticated?: boolean;
    // By default should be false.
    isForced?: boolean;
    queryParams?: QueryParams;
}

export type MethodsWithoutGET = Exclude<HttpMethods, HttpMethods.GET>;

export type GetRequest = RequestMethod<HttpMethods.GET> & BaseApiRequest<never>;
export type BodyRequest<TBody = never> = RequestMethod<MethodsWithoutGET> & BaseApiRequest<TBody>;

export type ApiRequest<TBody = never> = GetRequest | BodyRequest<TBody>;

export interface ApiRequestPromise<TResult> {
    deferred: {
        resolve: (result: TResult) => void;
        reject: (error: Error) => void;
    };
}
// tslint:disable-next-line:no-any
export type QueuedRequest = ApiRequest<any> & ApiRequestPromise<any>;
// #endregion

export interface ApiRequestBinaryBody<TData = Uint8Array> {
    isBinary: true;
    data: TData;
}

// #region OAuth identity
export interface OAuthIdentityConfiguration {
    host: string;
    loginPath: string;
    logoutPath: string;
    headers?: { [index: string]: string };
    renewTokenTime?: number | ((time: number) => number);
    tokenRenewalEnabled?: boolean;
}

export interface OAuthResponseDto {
    token_type: string;
    access_token: string;
    expires_in?: number;
    scope?: string;
    refresh_token?: string;
    id_token?: string;
}
// #endregion
