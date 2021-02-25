const express = require('express');

const app = express();

app.use(express.static(`${__dirname}/public`));

app.get('/', (req, res) => {
  res.render('client');
});

app.listen(8080, () => { console.log('Client server running on port 8080'); });
