const express = require('express');
const router = express.Router();
const PortalGenerateFactor = require('../scripts/portal_generate_factor.js');

router.get('/', (req, res) => {

  PortalGenerateFactor(reply => {
    res.end(JSON.stringify(reply));
  });
  
});

module.exports = router;