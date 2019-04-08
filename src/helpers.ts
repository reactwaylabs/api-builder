import { ApiRequestBinaryBody, OAuthResponseDto } from "./contracts";

// tslint:disable-next-line:no-any
export function isBinaryBody(body: any): body is ApiRequestBinaryBody {
    return body != null && (body as ApiRequestBinaryBody).isBinary === true;
}

// tslint:disable-next-line:no-any
export function isOAuthResponse(value: any): value is OAuthResponseDto {
    return value != null && value.token_type != null && value.access_token != null;
}
