const express = require('express');
const bcrypt = require('bcrypt');
var router = express.Router();
const db = require('./../db');

// this is the main user authentication for user login
// knex for mysql connection
// bcrypt for hashing
const validatePayloadMiddleware = (req, res, next) => {
    if (req.body.email && req.body.password) {
        next();
    } else {
        res.status(403).json({
            'errorMessage': 'You need a payload'
        });
    }
};
router.post('/auth', (req, res) => {
    // var username = 'test@dev.com';
    // var password = 'testing123';
    var username = req.body.email;
    var password = req.body.password;
    if (username && password) {
        db.select('id').from('users').where({
            email: username
        }).then(value => {
            if (value.length != 0) {
                db.select('password', 'id').from('users').where({
                    email: username
                }).then(async result => {
                    match = await bcrypt.compare(password, result[0].password.replace('$2y$', '$2a$'));
                    if (match) {
                        req.session.loggedIn = true
                        req.session.username = username
                        req.session.uid = result[0].id
                        res.json({
                            'isLoggedIn': req.session.loggedIn,
                            'id': req.session.uid,
                            'session-id': req.session.id
                        })
                    }
                    else {
                        res.json({
                            'message': 'Incorrect Password'
                        })
                    }
                })

            }
            else {
                res.json({
                    'message': 'User does not exist'
                })
            }
        }
        )
    } else {
        res.json({
            'message': 'Enter Username and Password'
        })
    }

})

router.get('/login', (req, res) => {
    if (req.session.loggedIn) {
        res.json({
            'isLoggedIn': true,
            'id': req.session.uid,
            'sessionId':req.session.id
        })
    } else {
        res.json({
            'isLoggedIn': false,
            'session':req.headers.cookie
        })
    }
})

router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            res.status(500).json({
                'message': 'Could not Log out'
            });
        } else {
            res.status(200).json({
                'message': 'sucess'
            });
        }
    });
})

router.get('/profile', (req, res) => {
    if (req.session.loggedIn) {
        db.select('name', 'address').from('users').where({
            id: req.session.uid
        }).then(result => {
            if (result.length != 0) {
                res.json(result[0])
            }
            else {
                res.json({
                    'message': 'No record found'
                })
            }
        })
    }
    else {
        res.json({
            'message': 'You are not logged in'
        })
    }
})
router.post('/update/name', (req, res) => {
    if (req.session.loggedIn) {
        db('users').where('id', '=', req.session.uid).update({
            name: req.body.name
        }).then(result => {
            if (result.length != 0) {
                res.json({
                    'message': 'Name Updated'
                })
            }
        }).catch(err => {
            res.json({
                'message': err
            })
        })
    }
    else {
        res.json({
            'message': 'You are not logged in'
        })
    }
})
router.post('/notification', (req, res) => {
    if (req.session.loggedIn) {
        const myValue = {
            user_id: req.session.uid,
            device_token: req.body.device_token
        }
        db('devices').where({
            device_token: req.body.device_token
        }).then(result => {
            if (result.length != 0) {
                res.json({
                    'message': 'device already added'
                })
            }
            else {
                db('devices').insert(myValue)
                    .then(myResult => {
                        if (myResult.length != 0) {
                            res.json({
                                'message': 'device added'
                            })
                        }
                        else {
                            res.json({
                                'message': 'error adding device'
                            })
                        }
                    })
            }
        })
    }
    else {
        res.json({
            'message': 'You are not logged in'
        })
    }
})

module.exports = router;