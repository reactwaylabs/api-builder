import queryString from "query-string";
import { QueuedRequest, ApiConfiguration, ApiRequest, HttpMethods, BaseApiRequest } from "./contracts";
import { REQUEST_QUEUE_LIMIT } from "./constants";
import { isBinaryBody } from "./helpers";

export class ApiBuilder {
    constructor(protected readonly configuration: ApiConfiguration) {
        if (configuration.identity != null) {
            configuration.identity.addListener("logout", this.onIdentityLogout.bind(this));
        }
    }

    private requestsQueue: QueuedRequest[] = [];
    private pendingRequests: number = 0;

    protected canMakeRequest(): boolean {
        const queueLimit = this.configuration.requestQueueLimit != null ? this.configuration.requestQueueLimit : REQUEST_QUEUE_LIMIT;
        return this.pendingRequests < queueLimit;
    }

    protected clearQueue(): void {
        this.requestsQueue = [];
    }

    protected onIdentityLogout(): void {
        this.clearQueue();
    }

    // tslint:disable-next-line:no-any
    private urlBuilder(request: ApiRequest<any>): string {
        const path: string = this.configuration.path != null ? this.configuration.path : "";
        let requestPath: string = "";
        let requestQueryString: string = "?";

        if (request.requestPath != null) {
            requestPath = request.requestPath;
        }

        if (this.configuration.defaultQueryParams != null) {
            requestQueryString += queryString.stringify(this.configuration.defaultQueryParams);
        }

        if (request.queryParams != null) {
            requestQueryString += queryString.stringify(request.queryParams);
        }

        if (requestQueryString === "?") {
            requestQueryString = "";
        }

        return `${this.configuration.host}${path}${requestPath}${requestQueryString}`;
    }

    protected async makeRequest(): Promise<void> {
        let request: QueuedRequest;

        const forceRequestIndex = this.requestsQueue.findIndex(x => x.isForced === true);
        const canMakeRequest = this.canMakeRequest();

        // FIXME: Refactor to be more readable (fail fast).
        // If there are forced requests waiting in the queue.
        if (forceRequestIndex !== -1) {
            // Perform them first no matter whether we're allowed to make requests.
            // Take force request out of the queue.
            request = this.requestsQueue.splice(forceRequestIndex, 1)[0];
        } else if (canMakeRequest) {
            // Simply take FIFO request.
            const nextInQueue = this.requestsQueue.shift();
            if (nextInQueue == null) {
                return;
            }
            request = nextInQueue;
        } else {
            return;
        }

        // Increment pending requests count.
        this.pendingRequests++;

        const requestUrl: string = this.urlBuilder(request);

        if (request.isAuthenticated === true) {
            if (this.configuration.identity == null) {
                throw new Error("Request isAuthenticated property is set to true, but there is no identity in configuration.");
            }
            request = await this.configuration.identity.authenticateRequest(request);
        }

        // tslint:disable-next-line:no-any
        let requestBody: any;
        if (request.body != null) {
            if (isBinaryBody(request.body)) {
                requestBody = request.body.data;
            } else {
                if (typeof request.body === "string") {
                    requestBody = request.body;
                } else {
                    requestBody = JSON.stringify(request.body);
                }
            }
        }

        try {
            const response = await fetch(requestUrl, {
                method: request.method,
                headers: {
                    ...(this.configuration.defaultHeaders || {}),
                    ...(request.headers || {})
                },
                body: requestBody
            });

            // If made request response is unauthorized then
            // we think that identity credentials are outdated and automatically logout.
            if (response.status === 401 && this.configuration.identity != null) {
                this.configuration.identity.logout();
                // TODO: Updated error message.
                throw new Error("Unauthorized request error.");
            }

            request.deferred.resolve(response);
        } catch (err) {
            request.deferred.reject(err);
        }

        this.pendingRequests--;
        this.makeRequest();
    }

    public async get(requestDto: BaseApiRequest<never>): Promise<Response> {
        return new Promise<Response>((resolve, reject) => {
            this.requestsQueue.push({
                ...requestDto,
                method: HttpMethods.GET,
                deferred: { resolve, reject }
            });
            this.makeRequest();
        });
    }

    public async post<TBody = {}>(requestDto: BaseApiRequest<TBody>): Promise<Response> {
        return new Promise<Response>((resolve, reject) => {
            this.requestsQueue.push({
                ...requestDto,
                method: HttpMethods.POST,
                deferred: { resolve, reject }
            });
            this.makeRequest();
        });
    }

    public async put<TBody = {}>(requestDto: BaseApiRequest<TBody>): Promise<Response> {
        return new Promise<Response>((resolve, reject) => {
            this.requestsQueue.push({
                ...requestDto,
                method: HttpMethods.PUT,
                deferred: { resolve, reject }
            });
            this.makeRequest();
        });
    }

    public async patch<TBody = {}>(requestDto: BaseApiRequest<TBody>): Promise<Response> {
        return new Promise<Response>((resolve, reject) => {
            this.requestsQueue.push({
                ...requestDto,
                method: HttpMethods.PATCH,
                deferred: { resolve, reject }
            });
            this.makeRequest();
        });
    }

    public async delete<TBody = {}>(requestDto: BaseApiRequest<TBody>): Promise<Response> {
        return new Promise<Response>((resolve, reject) => {
            this.requestsQueue.push({
                ...requestDto,
                method: HttpMethods.DELETE,
                deferred: { resolve, reject }
            });
            this.makeRequest();
        });
    }
}
