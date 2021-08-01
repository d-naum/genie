var express = require('express');
var router = express.Router();
const db = require('./../db');


router.get('/', (req, res) => {
    db.select('id', 'title').from('services').then(result => {
        res.json(result)
    })
        .catch(err => {
            res.json({
                'err': err.message
            })
            console.log(err)
        })
})
router.get('/:id/subservices', (req, res) => {
    db.select('id', 'title').from('sub_services').where({
        'service_id': req.params.id
    })
        .then(result => {
            res.json(result)
        })
        .catch(err => {
            res.json({
                'err': err.message
            })
            console.log(err)
        })

})

module.exports = router;