const express = require('express');
var router = express.Router();
const db = require('./../db');
const admin = require('firebase-admin');
admin.initializeApp({
    credential: admin.credential.cert({
        "private_key": process.env.PRIVATE_KEY.replace(/\\n/g, '\n'),
        "project_id": process.env.PROJECT_ID,
        "client_email": process.env.CLIENT_EMAIL
    }),
    databaseURL: "https://proud-outpost-282409.firebaseio.com"
})
router.get('', (req, res) => {
    res.json({ 'value': 'transection' })
})
router.get('/max', (req, res) => {
    let workerIds = []
    let userIds = []
    let registrationTokens = [];
    db.select('id').from('workers').whereIn('user_id', [205, 206])
        .then(result => {
            // res.json(result)
            result.forEach(workerId => {
                workerIds.push(workerId.id);
            })
            res.json(workerIds);
        })
})
// get transactions
router.get('/user', (req, res) => {
    if (req.session.loggedIn) {
        db.select('transactions.*', 'users.name as worker_name', 'services.title as service_title', 'sub_services.title as sub_service_title').from('transactions')
            .join('services', 'services.id', '=', 'transactions.service_id')
            .join('sub_services', 'sub_services.id', '=', 'transactions.sub_service_id')
            .leftJoin('workers', 'workers.id', '=', 'transactions.worker_id')
            .leftJoin('users', 'users.id', '=', 'workers.user_id').where({
                'transactions.user_id': req.session.uid
            })
            .then(result => {
                if (result.length != 0) {
                    res.json(result)
                }
                else {
                    res.json({
                        'message': 'No transactions found'
                    })
                }

            })
            .catch(err => {
                console.log('No Requests Found');
                res.json({
                    err: 'No Request Found'
                })
            })
    }
    else {
        res.json({
            'message': 'You are not logged in'
        })
    }
})
// post transaction
router.post('/user', (req, res) => {
    if (req.session.loggedIn) {

        db('transactions').insert(req.body)
            .then(result => {
                if (result.length != 0) {
                    console.log(result[0]);
                    res.json({
                        'transactionId': result[0],
                        'title': 'Request Submitted',
                        'message': 'Worker will be available soon'
                    })
                }
            })
            .catch(err => res.json({
                'message': err.message
            }))
    }
    else {
        res.json({
            'message': 'You are not logged in'
        })
    }

})
// get review of transactions by id
router.get('/review/:id', (req, res) => {
    if (req.session.loggedIn) {
        db('reviews').where({
            'transaction_id': req.params.id
        }).then(result => {
            if (result.length != 0) {
                res.json({
                    'status': 0,
                    'item': result[0]
                })
            }
            else {
                res.json({
                    'status': 1,
                    'message': 'No Review Found',
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
//post review
router.post('/review', (req, res) => {
    var registrationTokens = [];
    if (req.session.loggedIn) {
        db.select('worker_id', 'user_id').from('transactions').where({
            'id': req.body.id
        }).then(myResult => {
            if (req.session.uid === myResult[0].user_id) {
                var myObject = {
                    'transaction_id': req.body.id,
                    'customer_id': req.session.uid,
                    'worker_id': myResult[0].worker_id,
                    'rating': req.body.rating,
                    'feedback': req.body.feedback
                };
                db('reviews').insert(myObject)
                    .then(result => {
                        if (result.length != 0) {
                            // this will send notification to worker
                            // and post response on the website
                            //start
                            db.select('user_id').from('workers').where({
                                id: myResult[0].worker_id
                            }).then(otherResult => {
                                db.select('device_token').from('devices').where({
                                    user_id: otherResult[0].user_id
                                }).then(myOtherResult => {
                                    myOtherResult.forEach(doc => {
                                        registrationTokens.push(doc.device_token);
                                    })
                                    const message = {
                                        notification: {
                                            title: 'Customer Reviewed',
                                            body: `You got a ${req.body.rating} on the request`
                                        },
                                        id: req.body.id,
                                        tokens: registrationTokens,
                                    }
                                    admin.messaging().sendMulticast(message).then(response => {
                                        res.json({
                                            'message': 'Review Created'
                                        })
                                        console.log('Successfully sent message:', response);
                                    }).catch(err => {
                                        console.log(err);
                                    })
                                }).catch(err => {
                                    res.json({
                                        'error': err
                                    })
                                })
                            })
                            // end
                        }
                    })
                    .catch(err => res.json({
                        'message': err.message
                    }))
            }
            else {
                res.json({
                    'message': 'Cannot add review'
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
// post assign transaction
router.post('/assign', (req, res) => {
    let workerIds = [];
    let userIds = [];
    let registrationTokens = [];
    var transactionId=req.body.id;
    let n = req.body.n
    let s = req.body.s
    let e = req.body.e
    let w = req.body.w
    if (req.session.loggedIn) {
        db.select('id').from('workers').whereBetween('latitude', [n, s]).andWhereBetween('longitude', [w, e])
            .then(result => {
                if (result.length != 0) {
                    var myObject = {
                        'transaction_id': req.body.id,
                        'workers': JSON.stringify(result)
                    }
                    db('assigned_transactions').insert(myObject).then(myResult => {
                        if (myResult.length != 0) {
                            //send notification
                            //send response
                            //if error happened check the result value first
                            result.forEach(workerId => {
                                workerIds.push(workerId.id)
                            })
                            db.select('user_id').from('workers').whereIn('id', workerIds)
                                .then(otherResult => {
                                    otherResult.forEach(userId => {
                                        userIds.push(userId.user_id);
                                    })
                                    db.select('device_token').from('devices').whereIn('user_id', userIds).then(myOtherResult => {
                                        myOtherResult.forEach(deviceTokens => {
                                            registrationTokens.push(deviceTokens.device_token)
                                        })
                                        const message = {
                                            notification: {
                                                title: 'New Request',
                                                body: `Request Recieved from User`
                                            },
                                            data:{
                                                id:transactionId.toString()
                                            },
                                            tokens: registrationTokens,
                                        }
                                        admin.messaging().sendMulticast(message).then(response => {
                                            res.json({
                                                'message': 'Assign Created',
                                                'result': myResult
                                            })
                                            console.log('Successfully sent message:', response);
                                        }).catch(err => {
                                            console.log(err);
                                        })
                                    })

                                })



                        }
                        else {
                            res.json({
                                'message': 'Error in assigning work kindly declined the offer and create again'
                            })
                        }
                    })
                }
                else {
                    db('transactions').where({
                        id: req.body.id
                    }).update({
                        status: 3
                    })
                        .then(result => {
                            res.json({
                                'message': 'No worker found in your area',
                                'result': result,
                                'title': 'Declined'
                            })
                        }).catch(err => {
                            res.json('erorr:' + err)
                        })

                }

            })
            .catch(err => {
                console.log(err);
            })
    }
    else {
        res.json({
            'message': 'You are not logged In'
        })
    }


})

// get transaction by id
// router.get('/user/:id', (req, res) => {
//     if (req.session.loggedIn) {
//         db('transactions').where({
//             id: req.params.id
//         }).then(result => {
//             if (result.length != 0) {
//                 res.json(result[0])
//             }
//             else {
//                 res.json({
//                     'message': 'No transactions found'
//                 })
//             }
//         })
//     }
//     else {
//         res.json({
//             'error': 'You are not logged in'
//         })
//     }
// })
router.get('/user/:id', (req, res) => {
    if (req.session.loggedIn) {
        db.select('transactions.*', 'users.name as worker_name', 'services.title as service_title', 'sub_services.title as sub_service_title').from('transactions')
            .join('services', 'services.id', '=', 'transactions.service_id')
            .join('sub_services', 'sub_services.id', '=', 'transactions.sub_service_id')
            .leftJoin('workers', 'transactions.worker_id', '=', 'workers.id')
            .leftJoin('users', 'users.id', '=', 'workers.user_id').where({
                'transactions.id': req.params.id
            }).then(result => {
                if (result.length != 0) {
                    res.json(result[0])
                }
                else {
                    res.json({
                        'message': 'No transactions found'
                    })
                }
            })
    }
    else {
        res.json({
            'error': 'You are not logged in'
        })
    }
})
//when user cancel the transaction
router.post('/cancel', (req, res) => {
    let registrationTokens = [];
    var transactionId = req.body.id
    var value = 3
    if (req.session.loggedIn) {
        db('transactions').where('id', '=', transactionId).update({
            status: value
        }).then(result => {
            if (result.length != 0) {
                // for sending notification
                // and response back
                //start
                db.select('worker_id').from('transactions').where({
                    id: transactionId
                }).then(myResult => {
                    if (myResult.length != 0) {
                        db.select('user_id').from('workers').where({
                            id: myResult[0].worker_id
                        }).then(otherResult => {
                            db('devices').where({
                                user_id: otherResult[0].user_id
                            }).then(myOtherResult => {
                                myOtherResult.forEach(doc => {
                                    registrationTokens.push(doc.device_token);
                                })
                                const message = {
                                    notification: {
                                        title: 'Request Cancelled',
                                        body: `transaction# ${transactionId} is cancelled by user`
                                    },
                                    data:{
                                        id:transactionId.toString()
                                    },
                                    tokens: registrationTokens,
                                }
                                admin.messaging().sendMulticast(message).then(response => {
                                    res.json({
                                        'message': 'Request Cancelled'
                                    })
                                    console.log('Successfully sent message:', response);
                                }).catch(err => {
                                    console.log(err);
                                })
                                // end
                            }).catch(err => {
                                res.json({
                                    'error': err
                                })
                            })
                        })
                    }
                    else {
                        res.json({
                            'message': 'Request Cancelled'
                        })
                    }

                })
            }
        }).catch(err => {
            res.json({
                'error': err
            })
        })
    }
    else {
        res.json({
            'message': 'You are not logged in'
        })
    }
})
// when user fulfill the requested payment
router.post('/user/fulfill', (req, res) => {
    let registrationTokens = []
    var transactionId = req.body.id
    var value = 'fulfilled'
    if (req.session.loggedIn) {
        db('transactions').where('id', '=', transactionId).update({
            payment_status: value
        }).then(result => {
            if (result.length != 0) {
                // send notification of payment recieved
                // and to send response back
                db.select('worker_id').from('transactions').where({
                    id: transactionId
                }).then(myResult => {
                    if (myResult.length != 0) {
                        db.select('user_id').from('workers').where({
                            id: myResult[0].worker_id
                        }).then(otherResult => {
                            db('devices').where({
                                user_id: otherResult[0].user_id
                            }).then(myOtherResult => {
                                myOtherResult.forEach(doc => {
                                    registrationTokens.push(doc.device_token);
                                })
                                const message = {
                                    notification: {
                                        title: 'Payment Recieved',
                                        body: `Payment Recieved transaction# ${transactionId}`
                                    },
                                    data:{
                                        id:transactionId.toString()
                                    },
                                    tokens: registrationTokens,
                                }
                                admin.messaging().sendMulticast(message).then(response => {
                                    res.json({
                                        'message': 'User Completed transaction with payment'
                                    })
                                    console.log('Successfully sent message:', response);
                                }).catch(err => {
                                    console.log(err);
                                })
                                // end
                            }).catch(err => {
                                res.json({
                                    'error': err
                                })
                            })
                        })
                    }
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

//worker
router.get('/worker', (req, res) => {
    if (req.session.worker) {
        db.select('transactions.*', 'users.name as user_name', 'services.title as service_title', 'sub_services.title as sub_service_title').from('transactions')
            .join('services', 'services.id', '=', 'transactions.service_id')
            .join('sub_services', 'sub_services.id', '=', 'transactions.sub_service_id')
            .join('users', 'users.id', '=', 'transactions.user_id').where({
                'transactions.worker_id': req.session.workerId
            })
            .then(result => {
                if (result.length != 0) {
                    res.json(result)
                }
                else {
                    res.json({
                        'message': 'No transactions found'
                    })
                }
            })
            .catch(err => {
                console.log('No Requests Found');
                res.json({
                    err: 'No Request Found'
                })
            })
    }
    else {
        res.json({
            'error': 'You are not logged in'
        })
    }
})
router.get('/worker/:id', (req, res) => {
    if (req.session.worker) {
        db.select('transactions.*', 'users.name as user_name', 'services.title as service_title', 'sub_services.title as sub_service_title').from('transactions')
            .join('services', 'services.id', '=', 'transactions.service_id')
            .join('sub_services', 'sub_services.id', '=', 'transactions.sub_service_id')
            .join('users', 'users.id', '=', 'transactions.user_id').where({
                'transactions.id': req.params.id
            }).then(result => {
                if (result.length != 0) {
                    res.json(result[0])
                }
                else {
                    res.json({
                        'message': 'No transactions found'
                    })
                }
            })
    }
    else {
        res.json({
            'error': 'You are not logged in'
        })
    }
})
router.get('/assign', (req, res) => {
    var myValue = '%{"id":' + req.session.workerId + '}%'
    if (req.session.worker) {
        db.select('*').from('assigned_transactions').where('workers', 'like', myValue)
            .then(result => {
                res.json(result[0]);
            })
    }
    else {
        res.json({
            'error': 'You are not logged in'
        })
    }
})
// when worker accept the transaction
router.post('/accept', (req, res) => {
    var registrationTokens=[]
    var transactionId = req.body.transactionId
    var assignId = req.body.assignId

    if (req.session.worker) {
        db.select('assigned_to').from('assigned_transactions').where({
            id: assignId
        }).then(result => {
            if (result[0].assigned_to === 0) {
                db('assigned_transactions').where('id', '=', assignId).update({
                    assigned_to: req.session.workerId,
                    workers: null
                }).then(myResult => {
                    db('transactions').where('id', '=', transactionId).update({
                        worker_id: req.session.workerId,
                        status: 1
                    }).then(otherResult => {
                        if (otherResult.length != 0) {
                            // notification start
                            // response
                            db.select('user_id').from('transactions').where({
                                id: transactionId
                            }).then(myOtherResult => {
                                db.select('device_token').from('devices').where({
                                    user_id: myOtherResult[0].user_id
                                }).then(otherOtherResult => {
                                    otherOtherResult.forEach(doc => {
                                        registrationTokens.push(doc.device_token);
                                    })
                                    const message = {
                                        notification: {
                                            title: 'Worker Assigned',
                                            body: `Worker Assigned to transaction# ${transactionId}`
                                        },
                                        data:{
                                            id:transactionId.toString()
                                        },
                                        tokens: registrationTokens,
                                    }
                                    admin.messaging().sendMulticast(message).then(response => {
                                        res.json({
                                            'message': 'Congratulations! The Request is assigned to you'
                                        })
                                        console.log('Successfully sent message:', response);
                                    }).catch(err => {
                                        console.log(err);
                                    })

                                }).catch(err => {
                                    res.json({
                                        'message': 'unknown error happened'
                                    })
                                })
                            })

                        }
                    })
                        .catch(err => {
                            res.json({
                                'message': err
                            })
                        })
                })
            }
            else {
                res.json({
                    'message': 'You are late Request assigned to someone else'
                })
            }
        })
    }
    else {
        res.json({
            'error': 'You are not logged in'
        })
    }
})
// when worker reject transaction
router.post('/reject', (req, res) => {
    var assignId = req.body.assignId;
    var workersArray = req.body.workers;
    if (req.session.worker) {
        db('assigned_transactions').where('id', '=', assignId).update({
            workers: JSON.stringify(workersArray)
        }).then(result => {
            if (result.length != 0) {
                res.json({
                    'message': 'Sucessfully rejected'
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
            'error': 'You are not logged in'
        })
    }
})
// after completing tranaction before paying
router.post('/complete', (req, res) => {
    let registrationTokens = [];
    var transactionId = req.body.id;
    var value = req.body.value
    if (req.session.worker) {
        db('transactions').where('id', '=', transactionId).update({
            status: value
        }).then(result => {
            if (result.length != 0) {
                db.select('user_id').from('transactions').where({
                    id: transactionId
                }).then(myResult => {
                    db.select('device_token').from('devices').where({
                        user_id: myResult[0].user_id
                    }).then(myOtherResult => {
                        myOtherResult.forEach(doc => {
                            registrationTokens.push(doc.device_token);
                        })
                        const message = {
                            notification: {
                                title: 'Request Completed',
                                body: `Request completed with transaction# ${transactionId}`
                            },
                            data:{
                                id:transactionId.toString()
                            },
                            tokens: registrationTokens,
                        }
                        admin.messaging().sendMulticast(message).then(response => {
                            res.json({
                                'message': 'Transaction Successfully Completed'
                            })
                            console.log('Successfully sent message:', response);
                        }).catch(err => {
                            console.log(err);
                        })

                    }).catch(err => {
                        res.json({
                            'message': 'unknown error happened'
                        })
                    })
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
// request payment
router.post('/payment', (req, res) => {
    let registrationTokens = [];
    var transactionId = req.body.id;
    var amount = req.body.amount;
    var paymentStatus = "requested";
    if (req.session.worker) {
        db.select('user_id', 'worker_id').from('transactions').where({
            id: transactionId
        }).then(result => {
            if (result.length != 0) {
                var objPayment = {
                    transaction_id: transactionId,
                    worker_id: result[0].worker_id,
                    customer_id: result[0].user_id,
                    amount: amount
                }
                db('payments').insert(objPayment).then(myResult => {
                    if (myResult.length != 0) {
                        db('transactions').where('id', '=', transactionId).update({
                            payment_status: paymentStatus
                        }).then(otherResult => {
                            // send notificaton start
                            // send response
                            db.select('user_id').from('transactions').where({
                                id: transactionId
                            }).then(myOtherResult => {
                                db.select('device_token').from('devices').where({
                                    user_id: myOtherResult[0].user_id
                                }).then(otherOtherResult => {
                                    otherOtherResult.forEach(doc => {
                                        registrationTokens.push(doc.device_token);
                                    })
                                    const message = {
                                        notification: {
                                            title: 'Payment Requested',
                                            body: `Payment of ${amount} PKR with transaction#${transactionId} requested`
                                        },
                                        data:{
                                            id:transactionId.toString()
                                        },
                                        tokens: registrationTokens,
                                    }
                                    admin.messaging().sendMulticast(message).then(response => {
                                        res.json({
                                            'id': otherResult[0],
                                            'message': 'Payment request has been sent'
                                        })
                                        console.log('Successfully sent message:', response);
                                    }).catch(err => {
                                        console.log(err);
                                    })
                                    //end
                                }).catch(err => {
                                    res.json({
                                        'message': 'unknown error happened'
                                    })
                                })
                            })


                        }).catch(err => {
                            res.json({
                                'message': 'error updating transaction'
                            })
                        })

                    }
                }).catch(err => {
                    res.json({
                        'message': 'error creating payment try again'
                    })
                })
            }
        })
    }
    else {
        res.json({
            'message': 'You are not logged in'
        })
    }
});
// complete with payment for worker

router.post('/payment/complete', (req, res) => {
    let registrationTokens = [];
    var transactionId = req.body.id;
    var value = 'paid'
    if (req.session.worker) {
        db('transactions').where('id', '=', transactionId).update({
            payment_status: value
        }).then(result => {
            if (result.length != 0) {
                // notification start
                // response
                db.select('user_id').from('transactions').where({
                    id: transactionId
                }).then(myResult => {
                    db.select('device_token').from('devices').where({
                        user_id: myResult[0].user_id
                    }).then(myOtherResult => {
                        myOtherResult.forEach(doc => {
                            registrationTokens.push(doc.device_token);
                        })
                        const message = {
                            notification: {
                                title: 'Request Completed With Payment',
                                body: `Request payment completed with transaction#${transactionId}`
                            },
                            data:{
                                id:transactionId.toString()
                            },
                            tokens: registrationTokens,
                        }
                        admin.messaging().sendMulticast(message).then(response => {
                            res.json({
                                'message': 'Transaction with Payment Successfully Completed'
                            })
                            console.log('Successfully sent message:', response);
                        }).catch(err => {
                            console.log(err);
                        })
                        // end
                    }).catch(err => {
                        res.json({
                            'message': 'unknown error happened'
                        })
                    })
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

router.get('/workers/reviews/:id', (req, res) => {
    if (req.session.worker) {
        db('reviews').where({
            'transaction_id': req.params.id
        }).then(result => {
            if (result.length != 0) {
                res.json({
                    'status': 0,
                    'item': result[0]
                })
            }
            else {
                res.json({
                    'status': 1,
                    'message': 'No Review Found',
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
router.get('/workers/reviews', (req, res) => {
    if (req.session.worker) {
        db('reviews').where({
            'worker_id': req.session.workerId
        }).then(result => {
            res.json(result)
        }).catch(err => {
            res.json({
                'message': 'not found'
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