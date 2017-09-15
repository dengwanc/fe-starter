/**
 * Simple Unit Test Kit
 * usage::
 *
 * // function with assert
 * const { assert, $test  } = require('pathto/ut');
 *
 * $test(() => {
 *    assert(a == b);
 *    assert(c !== c);
 * }, 'should be ok')
 *
 * // async function with async
 *
 * $test(async () => {
 *     const get2wait1s = s => setTimeout(e => s(3), 500);
 *     const a = await new Promise(get2wait1s);
 *     assert(a == 4);
 * }, '4 assert should be fail');
 *
 */

class AssertionError extends Error {}

const isNode = (typeof window == 'undefined');
const assert = isNode
    ? require('assert')
    : (expr, msg) => { if (!expr) throw new AssertionError(msg); };

let collecting = false;

const cases = [];
const errors = [];
const results = {};
const startCollect = () => collecting = true;
const stopCollect = () => collecting = false;
const cleanCases = () => cases.length = 0;
const cleanErrors = () => errors.length = 0;
const shouldIgnore = process.env.NODE_ENV == 'production';

const $test = (fn, msg) => {
    if (shouldIgnore) return;
    if (typeof fn != 'function') throw new Error('first argument must be function');

    cases.push({ fn, msg });

    !collecting && nextLoop(() => {
        execTests()
            .then(afterAll)
            .catch(e => console.warn('~', e));
    });

    startCollect();
};

async function execTests() {
    const tasks = [];

    for (let { fn, msg } of cases) {
        const task = thenable(fn)
            .then(() => console.info('✓', msg))
            .catch(e => {
                errors.push(e.stack);
                console.error('x', msg, e.stack);
            });

        tasks.push(task);
    }

    await Promise.all(tasks);
}

function thenable(fn) {
    return new Promise(s => s(fn()));
}

function afterAll() {
    reportResult();
    stopCollect();
    cleanCases();
    cleanErrors();

    if (isNode) {
        exit();
    } else {
        sendExitMsg();
        friendlyTips();
    }
}

function exit() {

}

function sendExitMsg() {
    const axios = require('axios');
    const {testapi} = require('./shared');
    const params = {results};

    axios.default.post(testapi, params);
}

function friendlyTips() {
    let tips = document.getElementById('tips'); // eslint-disable-line
    let html = '';

    if (results.errors.length) {
        html = `<h3 style="color: red">
            unit test failed,
            please check devtools
            (may be need reload
        </h3>`;
    } else {
        html = `<h1 style="color: green">
            unit test passed !
        </h1>`;
    }

    tips.innerHTML = html;
}

function reportResult() {
    results.errors = errors.map(e => e);

    const total = results.total = cases.length;
    const passed = results.passed = cases.length - errors.length;
    const percent = results.percent = passed / total;

    console.info(results.description = `\nTotal ${total} Passed ${passed} (${percent*100}%)`);
}

function nextLoop(operation) {
    setTimeout(operation, 0);
}


/** interfaces */

exports.assert = assert;
exports.$test = $test;

// $test(() => assert(2 == 2), '1 assert should be success');
// $test(() => assert({} == {}), '2 assert should be fail');

// $test(async () => {
//   const get2wait1s = s => setTimeout(e => s(2), 500);
//   const a = await new Promise(get2wait1s);
//   assert(a == 2);
// }, '3 assert should be success');

// $test(async () => {
//   const get2wait1s = s => setTimeout(e => s(3), 500);
//   const a = await new Promise(get2wait1s);
//   assert(a == 4);
// }, '4 assert should be fail');
