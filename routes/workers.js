var express = require('express');
var router = express.Router();
const db = require('./../db');
const bcrypt = require('bcrypt');

router.post('/auth', (req, res) => {
    // var username = '03166202036';
    //var password = 'testing123';
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
                        db.select('role_id').from('model_has_roles').where({
                            model_id: req.session.uid
                        }).then(workerResult => {
                            if (workerResult.length != 0) {
                                if (workerResult[0].role_id === 3) {
                                    req.session.worker = true
                                    db.select('id').from('workers').where({
                                        user_id: req.session.uid
                                    }).then(myWorker => {
                                        if (myWorker.length != 0) {
                                            req.session.workerId = myWorker[0].id
                                            res.json({
                                                'isWorker': req.session.worker,
                                                'workerId': req.session.workerId,
                                                'session-id': req.session.id

                                            })
                                        }
                                        else {
                                            res.json({
                                                'message': 'unable to find data'
                                            })
                                        }
                                    })

                                }
                                else {
                                    res.json({
                                        'message': 'Cannot Sign in here use customer app'
                                    })
                                }

                            }
                            else {
                                res.json({
                                    'message': 'worker not found'
                                })
                            }
                        })

                        // res.json({
                        //     'isLoggedIn': req.session.loggedIn,
                        //     'id': req.session.uid,
                        //     'session-id': req.session.id
                        // })
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
    if (req.session.worker) {
        res.json({
            'isWorker': req.session.worker,
            'workerId': req.session.workerId,
            'id': req.session.uid
        })
    } else {
        res.json({
            'isWorker': false
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
    if (req.session.worker) {
        db.select('name', 'contact').from('users').where({
            id: req.session.uid
        }).then(result => {
            if (result.length != 0) {

                db.select('latitude', 'longitude', 'businessAddress', 'coreField').from('workers')
                    .where({ id: req.session.workerId })
                    .then(myResult => {
                        if (myResult.length != 0) {
                            res.json({
                                'name': result[0].name,
                                'contact': result[0].contact,
                                'latitude': myResult[0].latitude,
                                'longitude': myResult[0].longitude,
                                'businessAddress': myResult[0].businessAddress,
                                'coreField': myResult[0].coreField
                            })
                        }
                        else {
                            res.json({
                                'message': 'unable to find data'
                            })
                        }
                    })
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
    if (req.session.worker) {
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
    if (req.session.worker) {
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
        .catch(err=>{
            res.json({
                'message':'unable to do the action '
            })
        })
    }
    else {
        res.json({
            'message': 'You are not logged in'
        })
    }
})

module.exports = router;