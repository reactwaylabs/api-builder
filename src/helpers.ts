import { ApiRequestBinaryBody } from "./contracts";

// tslint:disable-next-line:no-any
export function isBinaryBody(body: any): body is ApiRequestBinaryBody {
    return body != null && (body as ApiRequestBinaryBody).isBinary === true;
}
