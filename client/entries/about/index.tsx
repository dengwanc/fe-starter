import * as React from 'react'
import router from '../../router'

export default class About extends React.Component {
    render() {
        return <div>
            <h1> About Page </h1>
            <button onClick={() => this.gotoSubmit()}> push to submit page </button>
            <button onClick={() => this.replaceSubmit()}> replace to submit page </button>
        </div>;
    }

    gotoSubmit() {
        router.push({
            path: '/submit',
            query: {
                a: '='
            }
        });
    }

    replaceSubmit() {
        router.replace('/submit');
    }

    componentDidMount() {
        document.title = '介绍';
    }
}

