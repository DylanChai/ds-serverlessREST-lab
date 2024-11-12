import { Construct } from "constructs";
type AuthApiProps = {
    userPoolId: string;
    userPoolClientId: string;
};
export declare class AuthApi extends Construct {
    private auth;
    private userPoolId;
    private userPoolClientId;
    constructor(scope: Construct, id: string, props: AuthApiProps);
    private addAuthRoute;
}
export {};
