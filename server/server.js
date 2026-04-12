const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*", // En production, restreindre aux domaines autorisés
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'goldadmin';

// Configuration de la base de données SQLite
const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'), (err) => {
  if (err) {
    console.error('Erreur lors de la connexion à la base de données:', err.message);
  } else {
    console.log('Connecté à la base de données SQLite.');
    
    // Création de la table si elle n'existe pas
    db.run(`CREATE TABLE IF NOT EXISTS gold_prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      price REAL NOT NULL,
      currency TEXT DEFAULT 'MAD',
      unit TEXT DEFAULT 'g',
      date DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        console.error('Erreur lors de la création de la table:', err.message);
      } else {
        // Initialiser avec un prix par défaut si la table est vide
        db.get('SELECT COUNT(*) as count FROM gold_prices', (err, row) => {
          if (row.count === 0) {
            db.run(`INSERT INTO gold_prices (price, currency, unit) VALUES (?, ?, ?)`, [650.00, 'MAD', 'g']);
          }
        });
      }
    });
  }
});

// Middlewares
app.use(cors());
app.use(express.json());

// Servir les fichiers statiques du dossier client/dist en production
// (Une fois que 'npm run build' a été exécuté dans le dossier client)
app.use(express.static(path.join(__dirname, '../client/dist')));

// Obtenir le prix actuel
app.get('/api/price', (req, res) => {
  db.get('SELECT * FROM gold_prices ORDER BY id DESC LIMIT 1', (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(row || { price: 0, currency: 'MAD', unit: 'g' });
  });
});

// Mettre à jour le prix (Nécessite authentification)
app.post('/api/price', (req, res) => {
  const { password, price, currency = 'MAD', unit = 'g' } = req.body;
  
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Mot de passe incorrect' });
  }

  if (!price || isNaN(price)) {
    return res.status(400).json({ error: 'Prix invalide' });
  }

  db.run(`INSERT INTO gold_prices (price, currency, unit) VALUES (?, ?, ?)`, [price, currency, unit], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    const newRecord = {
      id: this.lastID,
      price: parseFloat(price),
      currency,
      unit,
      date: new Date().toISOString()
    };

    // Émettre le nouveau prix à tous les clients connectés via WebSockets
    io.emit('priceUpdate', newRecord);
    
    res.json({ success: true, data: newRecord });
  });
});

// Route Fallback pour les applications React (SPA)
// Toutes les routes non reconnues par l'API doivent renvoyer vers l'index.html de React
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist', 'index.html'));
});

// Lancement du serveur
server.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
