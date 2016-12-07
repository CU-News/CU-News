import React from 'react'
import Article from './Article.js'
import {Grid, Row, Col} from 'react-bootstrap'

export default class ArticleTable extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            articles: []
        }
        this.refreshState = this.refreshState.bind(this)
    }

    refreshState() {
        fetch(`articles`)
            .then(res => res.json())
            .then((articles) => {
                articles = articles.sort((a, b) => b.votes - a.votes)
                this.setState({
                    articles
                })
            })
            .catch(err => console.log('Error fetching articles', err))
    }

    componentDidMount() {
        this.refreshState()
    }

    render() {
        const articles = this.state.articles.map((article, index) => {
            return (
                <Article
                    {...article} 
                    key={article._id}
                    index={index + 1}
                    handleVote={this.refreshState}
                />
            )
        })

        //TODO: Try bootstrap componets without {}'s
        return (
            <Grid>
                <Row>
                    <Col md={1} mdOffset={1}>
                        <h3>Number</h3>
                     </Col>
                     <Col md={5}>
                         <h3>Article</h3>
                     </Col>
                </Row>
                <Row>
                    {articles}
                </Row>
            </Grid>
        )
    }
}