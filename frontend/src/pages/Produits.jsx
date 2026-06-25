import { useEffect, useState } from 'react';
import { api } from '../api/client';

/** Consultation des produits financiers (classe UML ProduitFinancier) */
export default function Produits() {
  const [produits, setProduits] = useState([]);

  useEffect(() => {
    api.get('/produits').then((d) => setProduits(d.produits));
  }, []);

  const icones = { CELI: '🍁', REER: '🌅', CPG: '🔒', Fonds: '📊' };

  return (
    <div>
      <h1>Produits financiers 📈</h1>
      <p className="sous-titre">Découvrez nos produits d'épargne et de placement</p>
      <div className="grille grille-2">
        {produits.length === 0 && <p className="sous-titre">Aucun produit — lancez « npm run seed » côté backend.</p>}
        {produits.map((p) => (
          <div key={p._id} className="carte">
            <div className="flex justify-between items-center">
              <h2 className="!mb-0">{icones[p.type] || '💼'} {p.nom}</h2>
              <span className="badge">{p.type}</span>
            </div>
            <p className="sous-titre !mb-2 mt-1">{p.description}</p>
            <p className="text-2xl font-extrabold text-amber-700 dark:text-primaire-400">{p.valeur} %</p>
          </div>
        ))}
      </div>
    </div>
  );
}
