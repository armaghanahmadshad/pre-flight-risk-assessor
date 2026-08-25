const express = require('express');
const cors = require('cors');
const assessRoute = require('./routes/assess');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.use('/api', assessRoute);

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
