'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const Article = require('../models/ArticleModel.js')
const Keyword = require('../models/KeywordModel.js')
const request = require('request-promise')
const retext = require('retext')
const retextkeywords = require('retext-keywords')
const nlcstToString = require('nlcst-to-string')

const router = express.Router()

// 3 600 000 is 1 hour
const REFRESH = 300000

setInterval(() => {
    updateNews()
    console.log('ran') 
}, REFRESH)

function getWords(article) {
    let words = []
    retext().use(retextkeywords).process(
        `${article.title} ${article.description}`, (err, file) => {
            file.data.keywords.forEach((keyword) => {
                // sanitize it
                let word = sanitize(nlcstToString(keyword.matches[0].node))
                words.push(nlcstToString(keyword.matches[0].node))
            })
        })
    //console.log(article)
    return words
}

function getPhrases(article) {
    let words = []
    retext().use(retextkeywords).process(
        `${article.title} ${article.description}`, (err, file) => {
            file.data.keyphrases.forEach((phrase) => {
                words.push(sanitize(phrase.matches[0].nodes.map(nlcstToString).join('')))
            })
        })
    //console.log(article)
    return words
}

function sanitize(string) {
    // formats the string to lowercase, and removes all punctuation
    string = string.toLowerCase()
    return string.replace(/[^0-9a-z ]/g, '')
}

function dropArticles() {
    Article.remove({}, () => {})
    Keyword.remove({}, () => {})
}

function updateNews() {
    // hourly
    const url = `${process.env.NEWS_URI}`
    request(url)
        .then((res) => {
            const headlines = JSON.parse(res).articles
            let articles = headlines.map((old) => {
                // save art
                Article.findOne({url: old.url})
                    .then((article) => {
                        // already in database, do nothing
                        if (!article) throw new Error('Article not found')
                    })
                    .catch((err) => {
                        // not in db
                        let art = new Article(old)
                        art['keywords'] = getPhrases(art)
                        art['votes'] = 0
                        console.log(art)
                        art.save()
                    })
            })
        })
        .catch((error) => {
            console.log(error)
        })
}

function getAmount(vote) {
    return Math.abs(vote) / vote || 0
}

router.post('/vote', (req, res) => {
    console.log(req.body)
    let amount = getAmount(req.body.vote)
    console.log(`votes modified by ${amount} for ${req.body.id}`)
    if (amount === 0) {
        res.status(500).send({
            error: "Invalid value for vote",
            reqBody: req.body
        })
        return
    }

    let article = null
    Article.findById(req.body.id)
        .then((art) => {
            art.votes += amount
            article = art
            return art.save()
        })
        .then((data) => {
            data.keywords.forEach((word) => {
                // save keywords, add to their points
                console.log(`modifying ${word}`)
                Keyword.findOne({word})
                    .then((keyword) => {
                        console.log(`keyword.votes: ${keyword.votes}`)
                        let votes = keyword.votes
                        let len = votes.length
                        let newVote = {
                            sum: votes[len - 1].sum + amount,
                            time: Date.now()
                        }
                        votes.push(newVote)
                        keyword.save()
                    })
                    .catch((error) => {
                        console.log(`not found ${word}`)
                        let keyw = new Keyword({
                            word,
                            votes: [{
                                sum: amount,
                                time: Date.now()
                            }]
                        })
                        keyw.save()
                    })
            })
            console.log(`article: ${article}`)
            res.send(article)
            return

        })
        .catch((error) => {
            res.status(500).send({
                error,
                reqBody: req.body
            })
            return
        })
})

router.get('/', (req, res) => {
    Article
        .find()
        .lean()
        .then((art) => {
            res.send(art) 
        })
        .catch((error) => {
            res.status(500).send({
                error: `Articles weren't found: ${error}`,
                reqParams: req.params
            })
        })
})

router.get('/:id', (req, res) => {
    Article.findById(req.params.id)
        .then((art) => {
            res.send(art) 
        })
        .catch((error) => {
            res.status(500).send({
                error,
                reqParams: req.params
            })
        })
})

module.exports = router
