/**
 * front-end router manager
 * by hash history,
 * usage::
 *
 * // = router.js ==========================
 * const router = new Router({
 *  '/user': User,
 *  '/paper': {
 *    page: Paper,
 *    beforeEnter: (from, to, prevent) => {},
 *    beforeLeave: (from, to, prevent) => {}
 *  }
 * });
 *
 * // = index.tsx ==========================
 * class Home extend React {
 *   onClick1() {
 *     router.push('/submit');
 *   }
 *
 *   onClick2() {
 *      router.push({
 *        path: '/submit',
 *        query: {id: 4399}
 *      })
 *   }
 * }
 */

import * as React from 'react'
import * as ReactDOM from "react-dom"

export type RouteOptions = {
    page: React.ComponentClass;
    beforeEnter?: Function;
    beforeLeave?: Function;
    props?: Function;
}

export type Route = React.ComponentClass | RouteOptions;

export type Routes = {
    [path: string]: Route;
}

export type Path = string | PathOptions;

export type PathOptions = {
    path: string;
    query: Query;
}

declare const __ReactDOMRender__: Function;
declare const __ReactRenderLogs__: any[];

export default class ReactRouter {
    constructor(routes: Routes) {
        this.routes = routes;
        this.recordHref();

        window.addEventListener('load', () => this.register());
        window.addEventListener('hashchange', () => {

            this.register()

            if (!this.url.lastHash) {
                const logs = __ReactRenderLogs__;
                const last = logs.pop();

                if (last) {
                    ReactDOM.render(last[0], last[1]);
                }
            }
        });
    }

    push(path: Path) {
        const newUrl = this.url.update(path);
        const route = this.match(newUrl) as RouteOptions;

        if (route) {
            this.runHooks(route.beforeLeave, () => {
                location.hash = this.url.lastHash
                    ? location.hash.replace(this.url.lastHash, newUrl.lastHash)
                    : `${location.hash}#${newUrl.lastHash}`;
            });
        }
    }

    replace(path: Path) {
        const newUrl = this.url.update(path);
        const route = this.match(newUrl) as RouteOptions;

        if (route) {
            this.runHooks(route.beforeLeave, () => {
                location.replace(newUrl.url);
            })
        }
    }

    private oldHref = '';
    private conflict = false;
    private url: UrlParser;
    private current: Route | null;
    private routes: Routes;

    private recordHref() {
        this.oldHref = location.href;
    }

    private makeConflict() {
        this.conflict = true;
    }

    private solveConflict() {
        this.conflict = false;
    }

    /** if current path mathed return matched route */
    private match(url: UrlParser) {
        for (let path in this.routes) {
            if (path == url.path) {
                return this.routes[path];
            }
        }

        return null;
    }

    private mount(route: Route) {
        const Component = this.getComponent(route);
        const props = {}; // todo
        __ReactDOMRender__.call(
            ReactDOM,
            <Component {...props}></Component>,
            document.getElementById("root")
        );
    }

    private register() {
        if (this.conflict) return this.solveConflict();

        const url = this.url = new UrlParser(location.href);
        const route = this.current = this.match(url) as RouteOptions;

        if (route) {
            const action = () => this.mount(route);
            const reject = () => this.rollback();
            this.runHooks(route.beforeEnter, action, reject);
        }

        this.recordHref();
    }

    /** get React ComponentClass */
    private getComponent(route: Route) {
        const opts = route as RouteOptions;

        return opts.page ? opts.page : (route as React.ComponentClass);
    }

    private rollback() {
        if (location.href != this.oldHref) {
            this.makeConflict();
            location.replace(this.oldHref);
        }
    }

    /** if hook not prevented return true */
    private runHooks(hook: Function | undefined, action: Function, reject = ()=>{}) {
        let prevented = false;
        let prevent = () => {
            prevented = true;
        }

        hook && hook(prevent);
        prevented ? reject() : action();
    }
}

export type Query = {
    [k: string]: string | number | undefined;
}

/**
 * parse url like
 * @param
 * 'http://googlebridge.com/search/#LA11/#/user/a/?q=for+in+%E5%BE%AA%E7%8E%AF&start='
 *
 * @return
 * {
 *    url: 'http://googlebridge.com/search/#LA11/#/user/a/?q=for+in+%E5%BE%AA%E7%8E%AF&start=',
 *    lastHash: '/user/a/?q=for+in+%E5%BE%AA%E7%8E%AF&start=',
 *    query: {q: 'for+in+循环', start: undefined},
 *    path: '/user/a'
 * }
 */
export class UrlParser {
    constructor(url: string) {
        if (!this.isLegalUrl()) throw new Error(`url argument must be legal format. got: ${url}`);
        this._url = url;
        this._lastHash = this.parseLastHashPart();
        this._search = this.parseSearch();
        this._path = this.parsePath();
        this._query = this.parserQuery();
    }

    get url() { return this._url }
    get lastHash() { return this._lastHash }
    get query() { return this._query }
    get path() { return this._path }

    /**
     * given a path arg
     * return a totally new parser
     * usage::
     *
     * now parser state is
     * => url: 'http://w.a.c/#/tmp/?q=3'
     * url.update('/save') =>
     * => url: 'http://w.a.c/#/save'
     */
    update(path: Path) {
        const pathStr = this.genetatePath(path);
        const urlStr = this.lastHash ? this.url.replace(this.lastHash, pathStr) : `${this.url}/#${pathStr}`;

        return new UrlParser(urlStr);
    }



    private _url = '';
    private _lastHash = '';
    private _search = '';
    private _path = '';
    private _query = {} as Query;

    private genetatePath(path: Path) {
        const opts = path as PathOptions;

        if (opts.path) {
            const search = [] as string[];

            Object.keys(opts.query).forEach(key => {
                const value = encode(opts.query[key] as string);
                search.push(`${key}=${value}`);
            });

            return `${path}/?${search.join('&')}`;
        } else {
            return path as string;
        }
    }

    /** todo */
    private isLegalUrl() {
        return true;
    }

    /**
     * usage::
     * http://a.bbs.com/#/tmp => /tpm
     * http://a.com/#AL11/#/f => /f
     * http://a.com/#/tmp?q=1 => /tmp?q=1
     */
    private parseLastHashPart() {
        let url = this.url;
        let i = url.length - 2;

        for (; i > 0; i--) {
            if (url[i] == '#' && url[i+1] == '/') {
                break;
            }
        }

        return i == 0 ? ''  : url.substr(i + 1);
    }

    private parsePath() {
        // assert had got this._lastHash and this.search

        const total = this._lastHash.length;
        const tail = this._search.length;

        return this._lastHash.substr(0, total - tail);
    }

    private parseSearch() {
        // assert had got this._lastHash
        // if (!this._lastHash) throw new Error('some error happend UrlParser itself');

        let hash = this._lastHash;
        let i = 0;

        for (i; i < hash.length; i++) {
            if (hash[i] == '?') {
                break;
            }
        }

        return hash.substr(i);
    }

    /**
     * parse query string,
     * search string like
     * q=ok&id=983&text=%3d%4e
     */
    private parserQuery() {
        // assert had got this._search

        const keyAndValues = this._search.substr(1).split('&');
        const ret = Object.create(null) as Query;

        keyAndValues.forEach(kv => {
            const part = kv.split('=');
            const key = part[0];
            const value = part[1];
            if (key) {
                ret[key] = decode(value);
            }
        });

        return ret;
    }
}

function decode(s: string) {
    return s === undefined ? s : decodeURIComponent(s);
}

function encode(s: string) {
    return s === undefined ? '' : encodeURIComponent(s);
}

/**
 * test cases
 * = 1 ===========================
 *
 */