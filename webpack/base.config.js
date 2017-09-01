const {solve} = require('../utils/path');
const {entries, statics} = require('../manifest.dsl');
const {getEntries} = require('../utils/fs');
const tsconf = require(solve('client/tsconfig.json'));


const rules = [
    { test: /\.tsx?$/, loader: 'ts-loader', options: tsconf }
]

module.exports = {
    entry: makeEntryFiles(),

    output: {
        path: solve(statics),
        filename: '[name].js',
        publicPath: `/${statics}/`,
    },

    module: { rules },

    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.json']
    }
}

function makeEntryFiles() {
    const dir = solve(entries);
    const ret = {};

    getEntries(dir).forEach(entry => {
        ret[entry] = solve(dir, `${entry}/index.tsx`);
    });

    return ret;
}