require('dotenv').config();
const express = require('express');
const router = express.Router();
const SubdomainGenerateList = require('../scripts/subdomain_generate_list.js');

router.get('/', (req, res) => {

  SubdomainGenerateList(reply => {
    
    if (reply.status == 1) {
      res.end(JSON.stringify({status: 1, data: reply.data}));
      
    } else {
      res.end(JSON.stringify({status: reply.status}));
    }
  });
});

module.exports = router;


