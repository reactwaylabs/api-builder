import { OAuthIdentity } from "../oauth-identity";
import { OAuthResponseDto, HttpMethods } from "../../contracts";
import fetchMock from "fetch-mock";
jest.useFakeTimers();

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
const LOGIN_RESPONSE_NO_EXPIRES_IN: OAuthResponseDto = {
    scope: "offline_access",
    token_type: "Bearer",
    access_token: "ACCESS_TOKEN",
    refresh_token: "REFRESH_TOKEN"
};
const LOGIN_RESPONSE_NO_REFRESH_TOKEN: OAuthResponseDto = {
    scope: "offline_access",
    token_type: "Bearer",
    access_token: "ACCESS_TOKEN",
    // Seconds
    expires_in: 28800
};

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
function mockLoginSuccessNoExpiresIn(): void {
    fetchMock.post(
        `${TEST_HOST}${LOGIN_PATH}`,
        Promise.resolve({
            status: 200,
            body: JSON.stringify(LOGIN_RESPONSE_NO_EXPIRES_IN)
        })
    );
}

function mockLoginSuccessNoRefreshToken(): void {
    fetchMock.post(
        `${TEST_HOST}${LOGIN_PATH}`,
        Promise.resolve({
            status: 200,
            body: JSON.stringify(LOGIN_RESPONSE_NO_REFRESH_TOKEN)
        })
    );
}

function mockRenewFailed(): void {
    fetchMock.post(
        `${TEST_HOST}${LOGIN_PATH}`,
        Promise.resolve({
            status: 400
        })
    );
}

function mockLoginFailed(): void {
    fetchMock.post(
        `${TEST_HOST}${LOGIN_PATH}`,
        Promise.resolve({
            status: 500,
            body: "Failed to load"
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

function mockLogoutFailed(): void {
    fetchMock.post(
        `${TEST_HOST}${LOGOUT_PATH}`,
        Promise.resolve({
            status: 500,
            body: "Failed to load"
        })
    );
}
// #endregion

afterEach(() => {
    fetchMock.restore();
});

it("logins successfully", async done => {
    const fn = jest.fn();
    const identity = new OAuthIdentity({
        host: TEST_HOST,
        loginPath: LOGIN_PATH,
        logoutPath: LOGOUT_PATH
    });

    mockLoginSuccess();
    identity.on("login", fn);
    await identity.login("", "");

    expect(fn).toBeCalled();
    done();
});

it("logins successfully with no expires_in property", async done => {
    const identity = new OAuthIdentity({
        host: TEST_HOST,
        loginPath: LOGIN_PATH,
        logoutPath: LOGOUT_PATH
    });

    mockLoginSuccessNoExpiresIn();
    try {
        await identity.login("", "");
        done.fail();
    } catch {
        done();
    }
});

it("logins successfully with no refresh token", async done => {
    const fn = jest.fn();
    const identity = new OAuthIdentity({
        host: TEST_HOST,
        loginPath: LOGIN_PATH,
        logoutPath: LOGOUT_PATH
    });

    mockLoginSuccessNoRefreshToken();
    identity.on("login", fn);
    await identity.login("", "");

    expect(fn).toBeCalled();
    done();
});

it("logins successfully with disabled renewal token", async done => {
    const fn = jest.fn();
    const identity = new OAuthIdentity({
        host: TEST_HOST,
        loginPath: LOGIN_PATH,
        logoutPath: LOGOUT_PATH,
        tokenRenewalEnabled: false
    });

    mockLoginSuccess();
    identity.on("login", fn);
    await identity.login("", "");

    expect(fn).toBeCalled();
    done();
});

it("logins successfully with time renewal time(number)", async done => {
    const fn = jest.fn();
    const identity = new OAuthIdentity({
        host: TEST_HOST,
        loginPath: LOGIN_PATH,
        logoutPath: LOGOUT_PATH,
        renewTokenTime: 100
    });

    mockLoginSuccess();
    identity.on("login", fn);
    await identity.login("", "");

    expect(fn).toBeCalled();
    done();
});

it("logins successfully with time renewal time(function)", async done => {
    const fn = jest.fn();
    const identity = new OAuthIdentity({
        host: TEST_HOST,
        loginPath: LOGIN_PATH,
        logoutPath: LOGOUT_PATH,
        renewTokenTime: (time: number) => time - 100
    });

    mockLoginSuccess();
    identity.on("login", fn);
    await identity.login("", "");

    expect(fn).toBeCalled();
    done();
});

it("logins successfully with time renewal time less than expiration time", async done => {
    const fn = jest.fn();
    const identity = new OAuthIdentity({
        host: TEST_HOST,
        loginPath: LOGIN_PATH,
        logoutPath: LOGOUT_PATH,
        renewTokenTime: 28900
    });

    mockLoginSuccess();
    identity.on("login", fn);
    await identity.login("", "");

    expect(fn).toBeCalled();
    done();
});

it("logins successfully and new token", async done => {
    const fn = jest.fn();
    const identity = new OAuthIdentity({
        host: TEST_HOST,
        loginPath: LOGIN_PATH,
        logoutPath: LOGOUT_PATH
    });

    mockLoginSuccess();
    identity.on("login", fn);
    await identity.login("", "");
    expect(fn).toBeCalled();
    jest.runAllTimers();
    expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 28680);
    done();
});

it("logins failed", async done => {
    const identity = new OAuthIdentity({
        host: TEST_HOST,
        loginPath: LOGIN_PATH,
        logoutPath: LOGOUT_PATH
    });

    mockLoginFailed();
    try {
        await identity.login("", "");
        done.fail();
    } catch {
        done();
    }
});

it("logout success", async done => {
    const fn = jest.fn();
    const identity = new OAuthIdentity({
        host: TEST_HOST,
        loginPath: LOGIN_PATH,
        logoutPath: LOGOUT_PATH
    });

    mockLoginSuccess();
    identity.on("login", fn);
    await identity.login("", "");

    expect(fn).toBeCalled();

    mockLogoutSuccess();
    identity.on("logout", fn);
    await identity.logout();

    expect(fn).toBeCalled();
    done();
});

it("logout failed because of no login data set", async done => {
    const identity = new OAuthIdentity({
        host: TEST_HOST,
        loginPath: LOGIN_PATH,
        logoutPath: LOGOUT_PATH
    });

    mockLogoutSuccess();

    try {
        await identity.logout();
        done.fail();
    } catch {
        done();
    }
});

it("logout failed", async done => {
    const fn = jest.fn();
    const identity = new OAuthIdentity({
        host: TEST_HOST,
        loginPath: LOGIN_PATH,
        logoutPath: LOGOUT_PATH
    });

    mockLoginSuccess();
    identity.on("login", fn);
    await identity.login("", "");

    expect(fn).toBeCalled();

    mockLogoutFailed();
    try {
        await identity.logout();
        done.fail();
    } catch {
        done();
    }
});

it("bad refresh token", async done => {
    const identity = new OAuthIdentity({
        host: TEST_HOST,
        loginPath: LOGIN_PATH,
        logoutPath: LOGOUT_PATH
    });

    mockRenewFailed();

    try {
        await identity["renewToken"]("");
        done.fail();
    } catch {
        done();
    }
});

it("no Login data is set yet", async done => {
    const identity = new OAuthIdentity({
        host: TEST_HOST,
        loginPath: LOGIN_PATH,
        logoutPath: LOGOUT_PATH
    });

    try {
        await identity["authenticateRequest"]({
            requestPath: "/get",
            method: HttpMethods.GET,
            deferred: {} as any
        });
        done.fail();
    } catch {
        done();
    }
});
