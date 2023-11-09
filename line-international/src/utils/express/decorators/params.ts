import { ParameterType, getMeta, setMeta } from "../meta.js";

/**
 * Parameter decorator factory, creates parameter decorator
 */
function parameterlessDecoratorFactory(type: ParameterType) {
    return function (): ParameterDecorator {
        return function (target, methodName: string, index) {
            const meta = getMeta(target);
            if (meta.params[methodName] === undefined) {
                meta.params[methodName] = [];
            }
            meta.params[methodName].push({ index, type });
            setMeta(target, meta);
        };
    };
}

function decoratorFactory(type: ParameterType) {
    return function (name: string): ParameterDecorator {
        return function (target, methodName: string, index) {
            const meta = getMeta(target);
            if (meta.params[methodName] === undefined) {
                meta.params[methodName] = [];
            }
            meta.params[methodName].push({ index, type, name });
            setMeta(target, meta);
        };
    };
}
/**
 * Express req object
 */
export const Request = parameterlessDecoratorFactory(ParameterType.REQUEST);
/**
 * Express req object in short form
 */
export const Req = Request;
/**
 * Express res object
 */
export const Response = parameterlessDecoratorFactory(ParameterType.RESPONSE);
/**
 * Express res object in short form
 */
export const Res = Response;
/**
 * Express next function
 */
export const Next = parameterlessDecoratorFactory(ParameterType.NEXT);
/**
 * Express req.params object or single param, if param name was specified
 */
export const Params = decoratorFactory(ParameterType.PARAMS);
/**
 * Express req.query object or single query param, if query param name was specified
 */
export const Query = decoratorFactory(ParameterType.QUERY);
/**
 * Express req.body object or single body param, if body param name was specified
 */
export const Body = decoratorFactory(ParameterType.BODY);
/**
 * Express req.headers object or single headers param, if headers param name was specified
 */
export const Headers = decoratorFactory(ParameterType.HEADERS);
/**
 * Express req.body object or single cookies param, if cookies param name was specified
 */
export const Cookies = decoratorFactory(ParameterType.COOKIES);


export type BasicAuth = {
    username: string;
    password: string;
} | null;

/**
 * Gets basic auth user object or bearer auth token depending on param specified
 */
export const Auth = decoratorFactory(ParameterType.AUTH) as (name: 'bearer' | 'basic') => ParameterDecorator;

/**
 * Queue object for streaming responses
 */
export const Queue = parameterlessDecoratorFactory(ParameterType.QUEUE);