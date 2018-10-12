require('dotenv').config();
const express = require('express');
const router = express.Router();
const getDomain = require('../scripts/get_domain.js');

router.get('/:domain', (req, res, next) => {
  const domain = req.params.domain.trim();

  if (domain == '') {
    next();

  } else {
    getDomain(domain, reply => {
      if (reply.status == 200) {
        res.status(200).send(JSON.stringify(reply.data));
        
      } else {
        res.status(reply.status).send({msg: reply.msg});
      }  
    });
    
  }
});


router.get('/', (req, res) => {
  res.status(400).send({
    msg: '缺少参数'
  })
});

module.exports = router;