import { ApiBuilder } from "../api-builder";
import fetchMock from "fetch-mock";
import { ApiRequestBinaryBody, OAuthResponseDto, HttpMethods, ApiRequest, BaseApiRequest, QueryParams } from "../contracts";
import { OAuthIdentity } from "../identities/oauth-identity";
jest.useFakeTimers();

interface ApiTestClient {
    get: (requestDto: BaseApiRequest<never>) => Promise<Response>;
    post: <TBody = {}>(requestDto: BaseApiRequest<TBody>) => Promise<Response>;
    put: <TBody = {}>(requestDto: BaseApiRequest<TBody>) => Promise<Response>;
    patch: <TBody = {}>(requestDto: BaseApiRequest<TBody>) => Promise<Response>;
    delete: <TBody = {}>(requestDto: BaseApiRequest<TBody>) => Promise<Response>;

    getItem: () => Promise<Response>;
}

const API_TEST_HOST = "https://example.com";
const PATH = "/api";
const PATH_GET = "/get";
const PATH_POST = "/post";
const PATH_PUT = "/put";
const PATH_PATCH = "/patch";
const PATH_DELETE = "/delete";

const TEST_HOST = "https://example.com";
const LOGIN_PATH = "/api/login";
const LOGOUT_PATH = "/api/logout";

const LOGIN_RESPONSE: OAuthResponseDto = {
    scope: "offline_access",
    token_type: "Bearer",
    access_token: "ACCESS_TOKEN",
    refresh_token: "REFRESH_TOKEN",
    // Seconds
    expires_in: 28800
};

class ApiClient extends ApiBuilder {
    constructor(identity?: OAuthIdentity, queryParams?: QueryParams, queueLimit?: number, usePath?: boolean) {
        super({
            host: API_TEST_HOST,
            path: usePath === false ? undefined : PATH,
            identity: identity,
            defaultQueryParams: queryParams,
            requestQueueLimit: queueLimit
        });
    }

    public async getItem(): Promise<Response> {
        const request: ApiRequest = {
            requestPath: PATH_GET,
            method: HttpMethods.GET
        };
        return this.get(request);
    }
}

// FIXME: Temporary solution.
// tslint:disable-next-line:no-any
const ApiTestClient: { new (): ApiTestClient } = ApiClient as any;
// FIXME: Temporary solution.
// tslint:disable-next-line:no-any
const ApiTestClientIdentity: { new (identity: OAuthIdentity): ApiTestClient } = ApiClient as any;
const ApiTestClientQueryParams: { new (identity: undefined, queryParams: QueryParams): ApiTestClient } = ApiClient as any;
const ApiTestClientQueueLimits: { new (identity: undefined, queryParams: undefined, queueLimit: number): ApiTestClient } = ApiClient as any;
const ApiTestClientNoPath: {
    new (identity: undefined, queryParams: undefined, queueLimit: undefined, usePath: boolean): ApiTestClient;
} = ApiClient as any;

// #region Mocked fetch results.
function mockLoginSuccess(): void {
    fetchMock.post(
        `${TEST_HOST}${LOGIN_PATH}`,
        Promise.resolve({
            status: 200,
            body: JSON.stringify(LOGIN_RESPONSE)
        })
    );
}

function mockLogoutSuccess(): void {
    fetchMock.post(
        `${TEST_HOST}${LOGOUT_PATH}`,
        Promise.resolve({
            status: 200
        })
    );
}

function mockGetSuccess(): void {
    fetchMock.get(
        `${API_TEST_HOST}${PATH}${PATH_GET}`,
        Promise.resolve({
            status: 200
        })
    );
}

function mockGetAuthFailed(): void {
    fetchMock.get(
        `${API_TEST_HOST}${PATH}${PATH_GET}`,
        Promise.resolve({
            status: 401
        })
    );
}

function mockGetPathSuccess(): void {
    fetchMock.get(
        `${API_TEST_HOST}${PATH_GET}`,
        Promise.resolve({
            status: 200
        })
    );
}

function mockGetQueryParamsPathSuccess(): void {
    fetchMock.get(
        `${API_TEST_HOST}${PATH}${PATH_GET}?page=2`,
        Promise.resolve({
            status: 200
        })
    );
}

function mockPostSuccess(): void {
    fetchMock.post(
        `${API_TEST_HOST}${PATH}${PATH_POST}`,
        Promise.resolve({
            status: 200
        })
    );
}

function mockPutSuccess(): void {
    fetchMock.put(
        `${API_TEST_HOST}${PATH}${PATH_PUT}`,
        Promise.resolve({
            status: 200
        })
    );
}

function mockPatchSuccess(): void {
    fetchMock.patch(
        `${API_TEST_HOST}${PATH}${PATH_PATCH}`,
        Promise.resolve({
            status: 200
        })
    );
}

function mockDeleteSuccess(): void {
    fetchMock.delete(
        `${API_TEST_HOST}${PATH}${PATH_DELETE}`,
        Promise.resolve({
            status: 200
        })
    );
}
// #endregion

afterEach(() => {
    fetchMock.restore();
});

it("make Get request", async done => {
    const apiClient = new ApiTestClient();

    mockGetSuccess();

    const getExample = await apiClient.getItem();
    expect(getExample.status).toEqual(200);
    done();
});

it("make Post request", async done => {
    const apiBuilder = new ApiTestClient();

    mockPostSuccess();
    const getExample = await apiBuilder.post({
        requestPath: PATH_POST
    });

    expect(getExample.status).toEqual(200);
    done();
});

it("make Post request with body of type string", async done => {
    const apiBuilder = new ApiTestClient();

    mockPostSuccess();
    const getExample = await apiBuilder.post({
        requestPath: PATH_POST,
        body: "test"
    });

    expect(getExample.status).toEqual(200);
    done();
});

it("make Post request with body of type object", async done => {
    const apiBuilder = new ApiTestClient();

    mockPostSuccess();
    const getExample = await apiBuilder.post<{ name: string; surname: string }>({
        requestPath: PATH_POST,
        body: {
            name: "example",
            surname: "surname"
        }
    });

    expect(getExample.status).toEqual(200);
    done();
});

it("make Put request", async done => {
    const apiBuilder = new ApiTestClient();

    mockPutSuccess();
    const getExample = await apiBuilder.put<{ name: string }>({
        requestPath: PATH_PUT,
        body: {
            name: "example"
        }
    });

    expect(getExample.status).toEqual(200);
    done();
});

it("make Get request without config path given", async done => {
    const apiBuilder = new ApiTestClientNoPath(undefined, undefined, undefined, false);

    mockGetPathSuccess();
    const getExample = await apiBuilder.get({
        requestPath: PATH_GET
    });

    expect(getExample.status).toEqual(200);
    done();
});

it("make Get request with queue limits", async done => {
    const apiBuilder = new ApiTestClientQueueLimits(undefined, undefined, 1);

    mockGetSuccess();
    const getExampleOne = apiBuilder.get({
        requestPath: PATH_GET
    });
    const getExampleTwo = apiBuilder.get({
        requestPath: PATH_GET
    });

    const exampleOneResponse = await getExampleOne;
    const exampleTwoResponse = await getExampleTwo;

    expect(exampleOneResponse.status).toEqual(200);
    expect(exampleTwoResponse.status).toEqual(200);
    done();
});

it("make forced Get request", async done => {
    const apiBuilder = new ApiTestClient();

    mockGetSuccess();
    const getExample = await apiBuilder.get({
        requestPath: PATH_GET,
        isForced: true
    });

    expect(getExample.status).toEqual(200);
    done();
});

it("make Get request with api configuration query params", async done => {
    const queryParams: QueryParams = {
        page: 2
    };
    const apiBuilder = new ApiTestClientQueryParams(undefined, queryParams);

    mockGetQueryParamsPathSuccess();
    const getExample = await apiBuilder.get({
        requestPath: PATH_GET,
        isForced: true
    });

    expect(getExample.status).toEqual(200);
    done();
});

it("make Get request with request query params", async done => {
    const apiBuilder = new ApiTestClient();

    mockGetQueryParamsPathSuccess();
    const getExample = await apiBuilder.get({
        requestPath: PATH_GET,
        isForced: true,
        queryParams: {
            page: 2
        }
    });

    expect(getExample.status).toEqual(200);
    done();
});

it("make Post request with Uint8Array body", async done => {
    const apiBuilder = new ApiTestClient();

    mockPostSuccess();
    const getExample = await apiBuilder.post<ApiRequestBinaryBody>({
        requestPath: PATH_POST,
        body: {
            data: new Uint8Array([17, -45.3]),
            isBinary: true
        }
    });

    expect(getExample.status).toEqual(200);
    done();
});

it("make Delete request", async done => {
    const apiBuilder = new ApiTestClient();

    mockDeleteSuccess();
    const getExample = await apiBuilder.delete<{ id: number }>({
        requestPath: PATH_DELETE,
        body: {
            id: 1
        }
    });

    expect(getExample.status).toEqual(200);
    done();
});

it("make Patch request", async done => {
    const apiBuilder = new ApiTestClient();

    mockPatchSuccess();
    const getExample = await apiBuilder.patch<{ id: number }>({
        requestPath: PATH_PATCH,
        body: {
            id: 1
        }
    });

    expect(getExample.status).toEqual(200);
    done();
});

it("authenticated request", async done => {
    const identity = new OAuthIdentity({
        host: TEST_HOST,
        loginPath: LOGIN_PATH,
        logoutPath: LOGOUT_PATH
    });

    mockLoginSuccess();
    await identity.login("", "");

    const apiBuilder = new ApiTestClientIdentity(identity);

    mockGetSuccess();
    const getExample = await apiBuilder.get({
        requestPath: PATH_GET,
        isAuthenticated: true
    });

    expect(getExample.status).toEqual(200);
    done();
});

it("authenticated request but failed", async done => {
    const identity = new OAuthIdentity({
        host: TEST_HOST,
        loginPath: LOGIN_PATH,
        logoutPath: LOGOUT_PATH
    });

    mockLoginSuccess();
    await identity.login("", "");

    const apiBuilder = new ApiTestClientIdentity(identity);

    mockGetAuthFailed();
    mockLogoutSuccess();

    try {
        await apiBuilder.get({
            requestPath: PATH_GET,
            isAuthenticated: true
        });
        done.fail();
    } catch {
        done();
    }
});

it("authenticated request and then logout", async done => {
    const identity = new OAuthIdentity({
        host: TEST_HOST,
        loginPath: LOGIN_PATH,
        logoutPath: LOGOUT_PATH
    });

    mockLoginSuccess();
    await identity.login("", "");

    const apiBuilder = new ApiTestClientIdentity(identity);

    mockGetSuccess();
    const getExample = await apiBuilder.get({
        requestPath: PATH_GET,
        isAuthenticated: true
    });

    mockLogoutSuccess();
    expect(getExample.status).toEqual(200);
    await identity.logout();

    done();
});

it("making authenticated request, when no identity is provided.", async done => {
    const apiBuilder = new ApiBuilder({
        host: API_TEST_HOST,
        path: PATH
    });

    mockGetSuccess();

    new Promise<Response>((resolve, reject) => {
        apiBuilder["requestsQueue"].push({
            requestPath: PATH_GET,
            isAuthenticated: true,
            method: HttpMethods.GET,
            deferred: { resolve, reject }
        });
    });

    try {
        await apiBuilder["makeRequest"]();
        done.fail();
    } catch {
        done();
    }
});
