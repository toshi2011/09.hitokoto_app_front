const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 8080;

// 静的ファイルを提供
app.use(express.static(path.join(__dirname, 'dist')));

// SPAのルーティング対応
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
});