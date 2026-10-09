'use client';
import { useState } from 'react';
import { collection, writeBatch, doc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const FINAL_PRODUCTS = [
  // BAR - BEERS
  { name: 'Tusker Lager 500ml', cat: 'Bar - Beers', buy: 180, sell: 250, stock: 48, min: 12 },
  { name: 'Tusker Lager 330ml', cat: 'Bar - Beers', buy: 145, sell: 220, stock: 48, min: 12 },
  { name: 'Tusker Lite 500ml', cat: 'Bar - Beers', buy: 190, sell: 300, stock: 36, min: 10 },
  { name: 'Tusker Lite 330ml', cat: 'Bar - Beers', buy: 160, sell: 250, stock: 36, min: 10 },
  { name: 'Tusker Malt 500ml', cat: 'Bar - Beers', buy: 200, sell: 300, stock: 36, min: 10 },
  { name: 'Tusker Malt 330ml', cat: 'Bar - Beers', buy: 170, sell: 260, stock: 36, min: 10 },
  { name: 'Tusker Cider 500ml', cat: 'Bar - Beers', buy: 210, sell: 300, stock: 36, min: 10 },
  { name: 'Tusker Cider 330ml', cat: 'Bar - Beers', buy: 180, sell: 280, stock: 36, min: 10 },
  { name: 'White Cap Lager 500ml', cat: 'Bar - Beers', buy: 175, sell: 250, stock: 48, min: 12 },
  { name: 'White Cap Lager 330ml', cat: 'Bar - Beers', buy: 145, sell: 220, stock: 48, min: 12 },
  { name: 'White Cap Lite 500ml', cat: 'Bar - Beers', buy: 180, sell: 280, stock: 36, min: 10 },
  { name: 'Pilsner 500ml', cat: 'Bar - Beers', buy: 175, sell: 250, stock: 48, min: 12 },
  { name: 'Pilsner 330ml', cat: 'Bar - Beers', buy: 145, sell: 220, stock: 36, min: 10 },
  { name: 'Guinness Stout 500ml', cat: 'Bar - Beers', buy: 210, sell: 300, stock: 36, min: 10 },
  { name: 'Guinness Smooth 500ml', cat: 'Bar - Beers', buy: 210, sell: 300, stock: 36, min: 10 },
  { name: 'Balozi Lager 500ml', cat: 'Bar - Beers', buy: 180, sell: 250, stock: 36, min: 10 },
  { name: 'Heineken 500ml', cat: 'Bar - Beers', buy: 250, sell: 400, stock: 24, min: 6 },
  { name: 'Heineken 330ml', cat: 'Bar - Beers', buy: 220, sell: 350, stock: 24, min: 6 },
  { name: 'Budweiser 500ml', cat: 'Bar - Beers', buy: 240, sell: 380, stock: 24, min: 6 },
  { name: 'Budweiser 330ml', cat: 'Bar - Beers', buy: 210, sell: 350, stock: 24, min: 6 },
  { name: 'Corona 355ml', cat: 'Bar - Beers', buy: 260, sell: 400, stock: 24, min: 6 },
  { name: 'Hunters Dry 330ml', cat: 'Bar - Beers', buy: 190, sell: 300, stock: 36, min: 10 },
  { name: 'Hunters Gold 330ml', cat: 'Bar - Beers', buy: 190, sell: 300, stock: 36, min: 10 },
  { name: 'Savannah Cider 330ml', cat: 'Bar - Beers', buy: 210, sell: 350, stock: 36, min: 10 },
  { name: 'Smirnoff Black Ice 330ml', cat: 'Bar - Beers', buy: 190, sell: 300, stock: 36, min: 10 },
  { name: 'Smirnoff Guarana 330ml', cat: 'Bar - Beers', buy: 190, sell: 300, stock: 36, min: 10 },

  // SPIRITS
  { name: "Gilbey's Gin 250ml", cat: 'Spirits', buy: 450, sell: 700, stock: 24, min: 5 },
  { name: "Gilbey's Gin 350ml", cat: 'Spirits', buy: 650, sell: 1000, stock: 24, min: 5 },
  { name: "Gilbey's Gin 750ml", cat: 'Spirits', buy: 1350, sell: 2000, stock: 21, min: 5 },
  { name: "Gilbey's Gin 1L", cat: 'Spirits', buy: 1700, sell: 2500, stock: 12, min: 4 },
  { name: "Gordon's Gin 250ml", cat: 'Spirits', buy: 550, sell: 850, stock: 24, min: 5 },
  { name: "Gordon's Gin 350ml", cat: 'Spirits', buy: 800, sell: 1200, stock: 18, min: 5 },
  { name: "Gordon's Gin 750ml", cat: 'Spirits', buy: 1500, sell: 2300, stock: 18, min: 5 },
  { name: "Gordon's Gin 1L", cat: 'Spirits', buy: 1900, sell: 2800, stock: 12, min: 4 },
  { name: "Gordon's Pink Gin 700ml", cat: 'Spirits', buy: 1700, sell: 2600, stock: 12, min: 4 },
  { name: "Beefeater Gin 700ml", cat: 'Spirits', buy: 1600, sell: 2500, stock: 12, min: 4 },
  { name: "Bombay Sapphire 750ml", cat: 'Spirits', buy: 2000, sell: 3000, stock: 10, min: 3 },
  { name: "Tanqueray Gin 750ml", cat: 'Spirits', buy: 2200, sell: 3300, stock: 10, min: 3 },
  { name: "Chrome Gin 250ml", cat: 'Spirits', buy: 400, sell: 650, stock: 24, min: 5 },
  { name: "Chrome Gin 750ml", cat: 'Spirits', buy: 650, sell: 1100, stock: 18, min: 5 },
  { name: "Kenya King Gin 250ml", cat: 'Spirits', buy: 350, sell: 600, stock: 24, min: 5 },
  { name: "Kenya King Gin 750ml", cat: 'Spirits', buy: 650, sell: 1100, stock: 18, min: 5 },
  { name: "Kibao Gin 250ml", cat: 'Spirits', buy: 350, sell: 600, stock: 24, min: 5 },
  { name: "Kibao Gin 375ml", cat: 'Spirits', buy: 500, sell: 800, stock: 18, min: 5 },
  { name: "Kibao Gin 750ml", cat: 'Spirits', buy: 750, sell: 1200, stock: 18, min: 5 },
  { name: "Smirnoff Vodka 250ml", cat: 'Spirits', buy: 500, sell: 800, stock: 24, min: 5 },
  { name: "Smirnoff Vodka 350ml", cat: 'Spirits', buy: 700, sell: 1100, stock: 18, min: 5 },
  { name: "Smirnoff Vodka 750ml", cat: 'Spirits', buy: 1350, sell: 2000, stock: 18, min: 5 },
  { name: "Smirnoff Vodka 1L", cat: 'Spirits', buy: 1800, sell: 2600, stock: 12, min: 4 },
  { name: "Absolut Vodka 750ml", cat: 'Spirits', buy: 1900, sell: 2900, stock: 10, min: 3 },
  { name: "Ciroc Vodka 750ml", cat: 'Spirits', buy: 3500, sell: 5000, stock: 8, min: 2 },
  { name: "Chrome Vodka 250ml", cat: 'Spirits', buy: 400, sell: 650, stock: 24, min: 5 },
  { name: "Chrome Vodka 750ml", cat: 'Spirits', buy: 650, sell: 1100, stock: 18, min: 5 },
  { name: "Konyagi 250ml", cat: 'Spirits', buy: 350, sell: 600, stock: 24, min: 5 },
  { name: "Konyagi 375ml", cat: 'Spirits', buy: 500, sell: 800, stock: 18, min: 5 },
  { name: "Konyagi 750ml", cat: 'Spirits', buy: 800, sell: 1200, stock: 18, min: 5 },
  { name: "Jameson Irish Whisky 250ml", cat: 'Spirits', buy: 850, sell: 1300, stock: 18, min: 5 },
  { name: "Jameson Irish Whisky 350ml", cat: 'Spirits', buy: 1150, sell: 1700, stock: 18, min: 5 },
  { name: "Jameson Irish Whisky 500ml", cat: 'Spirits', buy: 1700, sell: 2500, stock: 12, min: 4 },
  { name: "Jameson Irish Whisky 750ml", cat: 'Spirits', buy: 2600, sell: 3500, stock: 15, min: 4 },
  { name: "Jameson Irish Whisky 1L", cat: 'Spirits', buy: 3000, sell: 4200, stock: 10, min: 3 },
  { name: "Johnnie Walker Red Label 200ml", cat: 'Spirits', buy: 650, sell: 1000, stock: 18, min: 5 },
  { name: "Johnnie Walker Red Label 350ml", cat: 'Spirits', buy: 950, sell: 1400, stock: 18, min: 5 },
  { name: "Johnnie Walker Red Label 750ml", cat: 'Spirits', buy: 1900, sell: 3000, stock: 12, min: 4 },
  { name: "Johnnie Walker Black Label 375ml", cat: 'Spirits', buy: 1700, sell: 2500, stock: 10, min: 3 },
  { name: "Johnnie Walker Black Label 750ml", cat: 'Spirits', buy: 3600, sell: 4500, stock: 10, min: 3 },
  { name: "Johnnie Walker Double Black 1L", cat: 'Spirits', buy: 5000, sell: 6500, stock: 6, min: 2 },
  { name: "Chivas Regal 12 Years 750ml", cat: 'Spirits', buy: 2800, sell: 4000, stock: 8, min: 2 },
  { name: "Ballantine's Finest 750ml", cat: 'Spirits', buy: 1700, sell: 2500, stock: 10, min: 3 },
  { name: "Black & White Whisky 750ml", cat: 'Spirits', buy: 1150, sell: 1800, stock: 18, min: 5 },
  { name: "VAT 69 750ml", cat: 'Spirits', buy: 1100, sell: 1700, stock: 18, min: 5 },
  { name: "Famous Grouse 750ml", cat: 'Spirits', buy: 1700, sell: 2500, stock: 10, min: 3 },
  { name: "Grant's Whisky 750ml", cat: 'Spirits', buy: 1700, sell: 2500, stock: 10, min: 3 },
  { name: "Teacher's Whisky 750ml", cat: 'Spirits', buy: 1400, sell: 2200, stock: 12, min: 4 },
  { name: "Jack Daniel's 750ml", cat: 'Spirits', buy: 2900, sell: 4000, stock: 8, min: 2 },
  { name: "Captain Morgan Gold 750ml", cat: 'Spirits', buy: 1400, sell: 2200, stock: 12, min: 4 },
  { name: "Viceroy 750ml", cat: 'Spirits', buy: 1300, sell: 2000, stock: 12, min: 4 },
  { name: "Richot Brandy 750ml", cat: 'Spirits', buy: 1200, sell: 1800, stock: 12, min: 4 },
  { name: "Kenya Cane 750ml", cat: 'Spirits', buy: 750, sell: 1200, stock: 18, min: 5 },
  { name: "Hennessy VS 700ml", cat: 'Spirits', buy: 3500, sell: 5000, stock: 6, min: 2 },
  { name: "Hennessy VSOP 700ml", cat: 'Spirits', buy: 6000, sell: 8500, stock: 4, min: 1 },
  { name: "Jägermeister 700ml", cat: 'Spirits', buy: 2700, sell: 4000, stock: 6, min: 2 },
  { name: "Amarula Cream 750ml", cat: 'Spirits', buy: 1900, sell: 2800, stock: 8, min: 2 },

  // SODA / WATER
  { name: 'Coca-Cola 300ml', cat: 'Soda / Water', buy: 60, sell: 100, stock: 72, min: 20 },
  { name: 'Coca-Cola 500ml', cat: 'Soda / Water', buy: 80, sell: 150, stock: 72, min: 20 },
  { name: 'Coca-Cola 1L', cat: 'Soda / Water', buy: 130, sell: 220, stock: 36, min: 10 },
  { name: 'Coca-Cola 2L', cat: 'Soda / Water', buy: 180, sell: 300, stock: 24, min: 6 },
  { name: 'Fanta Orange 300ml', cat: 'Soda / Water', buy: 60, sell: 100, stock: 72, min: 20 },
  { name: 'Fanta Orange 500ml', cat: 'Soda / Water', buy: 80, sell: 150, stock: 72, min: 20 },
  { name: 'Fanta 2L', cat: 'Soda / Water', buy: 180, sell: 300, stock: 24, min: 6 },
  { name: 'Sprite 300ml', cat: 'Soda / Water', buy: 60, sell: 100, stock: 72, min: 20 },
  { name: 'Sprite 500ml', cat: 'Soda / Water', buy: 80, sell: 150, stock: 72, min: 20 },
  { name: 'Sprite 1L', cat: 'Soda / Water', buy: 130, sell: 220, stock: 36, min: 10 },
  { name: 'Sprite 2L', cat: 'Soda / Water', buy: 180, sell: 300, stock: 24, min: 6 },
  { name: 'Stoney 300ml', cat: 'Soda / Water', buy: 60, sell: 100, stock: 72, min: 20 },
  { name: 'Stoney 500ml', cat: 'Soda / Water', buy: 80, sell: 150, stock: 72, min: 20 },
  { name: 'Schweppes Tonic 300ml', cat: 'Soda / Water', buy: 100, sell: 180, stock: 36, min: 10 },
  { name: 'Schweppes Soda 300ml', cat: 'Soda / Water', buy: 100, sell: 180, stock: 36, min: 10 },
  { name: 'Schweppes Ginger Ale 300ml', cat: 'Soda / Water', buy: 100, sell: 180, stock: 36, min: 10 },
  { name: 'Dasani Water 500ml', cat: 'Soda / Water', buy: 40, sell: 80, stock: 96, min: 24 },
  { name: 'Dasani Water 1L', cat: 'Soda / Water', buy: 70, sell: 120, stock: 48, min: 12 },
  { name: 'Aquamist Water 500ml', cat: 'Soda / Water', buy: 35, sell: 80, stock: 96, min: 24 },
  { name: 'Aquamist Water 1L', cat: 'Soda / Water', buy: 60, sell: 120, stock: 48, min: 12 },
  { name: 'Keringet Water 500ml', cat: 'Soda / Water', buy: 45, sell: 100, stock: 96, min: 24 },
  { name: 'Keringet Water 1L', cat: 'Soda / Water', buy: 80, sell: 150, stock: 48, min: 12 },

  // FOOD / KITCHEN
  { name: 'Chips Regular 1 Portion', cat: 'Food / Kitchen', buy: 80, sell: 200, stock: 50, min: 10 },
  { name: 'Chips Masala 1 Portion', cat: 'Food / Kitchen', buy: 100, sell: 250, stock: 50, min: 10 },
  { name: 'Chicken Wings 1 Portion', cat: 'Food / Kitchen', buy: 300, sell: 650, stock: 30, min: 6 },
  { name: 'Fried Chicken 1 Portion', cat: 'Food / Kitchen', buy: 250, sell: 500, stock: 30, min: 6 },
  { name: 'Beef Samosa 1 Piece', cat: 'Food / Kitchen', buy: 30, sell: 80, stock: 100, min: 20 },
  { name: 'Vegetable Samosa 1 Piece', cat: 'Food / Kitchen', buy: 20, sell: 60, stock: 100, min: 20 },
  { name: 'Sausage 1 Piece', cat: 'Food / Kitchen', buy: 40, sell: 100, stock: 80, min: 15 },
  { name: 'Smokie 1 Piece', cat: 'Food / Kitchen', buy: 35, sell: 80, stock: 80, min: 15 },
  { name: 'Beef Burger 1 Portion', cat: 'Food / Kitchen', buy: 250, sell: 550, stock: 25, min: 5 },
  { name: 'Chicken Burger 1 Portion', cat: 'Food / Kitchen', buy: 280, sell: 600, stock: 25, min: 5 },
  { name: 'Beef Steak 1 Portion', cat: 'Food / Kitchen', buy: 400, sell: 900, stock: 20, min: 5 },
  { name: 'Chicken Skewers 1 Portion', cat: 'Food / Kitchen', buy: 250, sell: 600, stock: 25, min: 5 },
  { name: 'Beef Skewers 1 Portion', cat: 'Food / Kitchen', buy: 300, sell: 650, stock: 25, min: 5 },
  { name: 'Goat Meat 1 Portion', cat: 'Food / Kitchen', buy: 350, sell: 750, stock: 20, min: 5 },
  { name: 'Fried Fish 1 Portion', cat: 'Food / Kitchen', buy: 350, sell: 800, stock: 20, min: 5 },
  { name: 'Nyama Choma 1 Portion', cat: 'Food / Kitchen', buy: 400, sell: 900, stock: 20, min: 5 },
  { name: 'Pork 1 Portion', cat: 'Food / Kitchen', buy: 350, sell: 800, stock: 20, min: 5 },
  { name: 'Beef Pilau 1 Portion', cat: 'Food / Kitchen', buy: 180, sell: 450, stock: 30, min: 6 },
  { name: 'Chicken Pilau 1 Portion', cat: 'Food / Kitchen', buy: 220, sell: 500, stock: 30, min: 6 },
  { name: 'Plain Rice 1 Portion', cat: 'Food / Kitchen', buy: 80, sell: 200, stock: 40, min: 8 },
  { name: 'Ugali 1 Portion', cat: 'Food / Kitchen', buy: 40, sell: 120, stock: 40, min: 8 },
  { name: 'Chapati 1 Piece', cat: 'Food / Kitchen', buy: 25, sell: 70, stock: 80, min: 15 },
  { name: 'Sukuma Wiki 1 Portion', cat: 'Food / Kitchen', buy: 40, sell: 100, stock: 40, min: 8 },
  { name: 'Kachumbari 1 Portion', cat: 'Food / Kitchen', buy: 30, sell: 100, stock: 40, min: 8 },

  // WINE
  { name: 'Four Cousins Red 750ml', cat: 'Wine', buy: 850, sell: 1500, stock: 12, min: 3 },
  { name: 'Four Cousins White 750ml', cat: 'Wine', buy: 850, sell: 1500, stock: 12, min: 3 },
  { name: 'Four Cousins Rosé 750ml', cat: 'Wine', buy: 850, sell: 1500, stock: 12, min: 3 },
  { name: '4th Street Red 750ml', cat: 'Wine', buy: 850, sell: 1500, stock: 12, min: 3 },
  { name: '4th Street White 750ml', cat: 'Wine', buy: 850, sell: 1500, stock: 12, min: 3 },
  { name: 'Robertson Red 750ml', cat: 'Wine', buy: 1200, sell: 2000, stock: 8, min: 2 },
  { name: 'Robertson White 750ml', cat: 'Wine', buy: 1200, sell: 2000, stock: 8, min: 2 },
  { name: 'Robertson Rosé 750ml', cat: 'Wine', buy: 1200, sell: 2000, stock: 8, min: 2 },
  { name: 'Cellar Cask Red 750ml', cat: 'Wine', buy: 700, sell: 1300, stock: 12, min: 3 },
  { name: 'Cellar Cask White 750ml', cat: 'Wine', buy: 700, sell: 1300, stock: 12, min: 3 },
  { name: 'Caprice Red 750ml', cat: 'Wine', buy: 700, sell: 1300, stock: 12, min: 3 },
  { name: 'Caprice White 750ml', cat: 'Wine', buy: 700, sell: 1300, stock: 12, min: 3 },
  { name: 'Caprice Rosé 750ml', cat: 'Wine', buy: 700, sell: 1300, stock: 12, min: 3 },
  { name: 'Drostdy-Hof Red 750ml', cat: 'Wine', buy: 800, sell: 1400, stock: 10, min: 3 },
  { name: 'Drostdy-Hof White 750ml', cat: 'Wine', buy: 800, sell: 1400, stock: 10, min: 3 },
  { name: 'Sparkling Wine 750ml', cat: 'Wine', buy: 1000, sell: 1800, stock: 8, min: 2 },
  { name: 'Moët & Chandon 750ml', cat: 'Wine', buy: 12000, sell: 18000, stock: 4, min: 1 },
  { name: 'Veuve Clicquot 750ml', cat: 'Wine', buy: 12000, sell: 18000, stock: 4, min: 1 },
  { name: 'Martini Asti 750ml', cat: 'Wine', buy: 2500, sell: 4000, stock: 6, min: 2 },
  { name: 'J.C. Le Roux Brut 750ml', cat: 'Wine', buy: 1300, sell: 2200, stock: 8, min: 2 },

  // CIGARETTES
  { name: 'Embassy Kings 20s', cat: 'Cigarette', buy: 400, sell: 500, stock: 100, min: 20 },
  { name: 'Embassy Filter 20s', cat: 'Cigarette', buy: 400, sell: 500, stock: 100, min: 20 },
  { name: 'Sportsman 20s', cat: 'Cigarette', buy: 400, sell: 500, stock: 100, min: 20 },
  { name: 'Rothmans 20s', cat: 'Cigarette', buy: 400, sell: 500, stock: 100, min: 20 },
  { name: 'Rothmans King Size 20s', cat: 'Cigarette', buy: 400, sell: 500, stock: 100, min: 20 },
  { name: 'Dunhill 20s', cat: 'Cigarette', buy: 550, sell: 650, stock: 60, min: 15 },
  { name: 'Dunhill Switch 20s', cat: 'Cigarette', buy: 550, sell: 650, stock: 60, min: 15 },
  { name: 'Safari 20s', cat: 'Cigarette', buy: 350, sell: 450, stock: 100, min: 20 },
  { name: 'Sweet Menthol 20s', cat: 'Cigarette', buy: 400, sell: 500, stock: 80, min: 15 },
  { name: 'Viceroy 20s', cat: 'Cigarette', buy: 350, sell: 450, stock: 100, min: 20 },

  // OTHER
  { name: 'Red Bull 250ml', cat: 'Other', buy: 180, sell: 300, stock: 48, min: 12 },
  { name: 'Monster Energy 500ml', cat: 'Other', buy: 180, sell: 300, stock: 36, min: 10 },
  { name: 'Predator Energy 250ml', cat: 'Other', buy: 90, sell: 150, stock: 48, min: 12 },
  { name: 'Sting Energy 250ml', cat: 'Other', buy: 70, sell: 120, stock: 48, min: 12 },
  { name: 'Ice 1kg', cat: 'Other', buy: 50, sell: 100, stock: 30, min: 6 },
  { name: 'Ice 5kg', cat: 'Other', buy: 200, sell: 400, stock: 15, min: 4 },
  { name: 'Chewing Gum 1 Pack', cat: 'Other', buy: 50, sell: 100, stock: 30, min: 6 },
  { name: 'Mints 1 Pack', cat: 'Other', buy: 50, sell: 100, stock: 30, min: 6 },
  { name: 'Lighter 1 Piece', cat: 'Other', buy: 50, sell: 100, stock: 30, min: 6 },
];

export default function BulkSeedPage() {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('');
  const [done, setDone] = useState(0);
  const [msg, setMsg] = useState('');

  const deleteAndSeed = async () => {
    if(!confirm(`⚠️ DELETE ALL existing products and ADD ${FINAL_PRODUCTS.length} new with EXACT buy/sell/stock/min? This cannot be undone!`)) return;
    setLoading(true); setMsg('');
    try {
      setStep('Step 1/2: Deleting old products...');
      const snap = await getDocs(collection(db, 'products'));
      // delete in batches of 400
      for(let i=0; i<snap.docs.length; i+=400){
        const batch = writeBatch(db);
        snap.docs.slice(i,i+400).forEach(d=> batch.delete(d.ref));
        await batch.commit();
      }
      setStep(`Deleted ${snap.docs.length} old. Step 2/2: Adding ${FINAL_PRODUCTS.length} new...`);
      
      for(let i=0; i<FINAL_PRODUCTS.length; i+=400){
        const chunk = FINAL_PRODUCTS.slice(i, i+400);
        const batch = writeBatch(db);
        chunk.forEach(p=>{
          const ref = doc(collection(db, 'products'));
          batch.set(ref, {
            name: p.name,
            category: p.cat,
            buyingPrice: p.buy,
            sellingPrice: p.sell,
            stock: p.stock,
            minStock: p.min,
            lowStockAlert: p.min,
            minStockAlert: p.min,
            branchId: 'chebunyo_main',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        });
        await batch.commit();
        setDone(i+chunk.length);
      }
      setMsg(`✅ PERFECT! Deleted ${snap.docs.length} old, Added ${FINAL_PRODUCTS.length} new. Categories: Bar - Beers, Spirits, Soda / Water, Food / Kitchen, Wine, Cigarette, Other`);
    } catch(e:any){ setMsg(`Error: ${e.message}`); }
    setLoading(false); setStep('');
  };

  return (
    <div style={{padding:24, maxWidth:800}}>
      <h1 style={{fontWeight:800, fontSize:22, color:'#dc2626'}}>⚠️ FINAL SEED - DELETE OLD + ADD NEW</h1>
      <p style={{fontSize:13, color:'#64748b', marginTop:8}}>This will <b>DELETE ALL</b> products in Firestore and add your exact final list: <b>{FINAL_PRODUCTS.length} products</b> with correct Buy Price, Sell Price, Current Stock, Minimum Stock Alert.</p>
      <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginTop:16}}>
        <div style={{background:'white', padding:10, borderRadius:8, border:'1px solid #e2e8f0', fontSize:12}}><b>Bar - Beers</b>: {FINAL_PRODUCTS.filter(p=>p.cat==='Bar - Beers').length}</div>
        <div style={{background:'white', padding:10, borderRadius:8, border:'1px solid #e2e8f0', fontSize:12}}><b>Spirits</b>: {FINAL_PRODUCTS.filter(p=>p.cat==='Spirits').length}</div>
        <div style={{background:'white', padding:10, borderRadius:8, border:'1px solid #e2e8f0', fontSize:12}}><b>Soda / Water</b>: {FINAL_PRODUCTS.filter(p=>p.cat==='Soda / Water').length}</div>
        <div style={{background:'white', padding:10, borderRadius:8, border:'1px solid #e2e8f0', fontSize:12}}><b>Food / Kitchen</b>: {FINAL_PRODUCTS.filter(p=>p.cat==='Food / Kitchen').length}</div>
        <div style={{background:'white', padding:10, borderRadius:8, border:'1px solid #e2e8f0', fontSize:12}}><b>Wine</b>: {FINAL_PRODUCTS.filter(p=>p.cat==='Wine').length}</div>
        <div style={{background:'white', padding:10, borderRadius:8, border:'1px solid #e2e8f0', fontSize:12}}><b>Cigarette/Other</b>: {FINAL_PRODUCTS.filter(p=>['Cigarette','Other'].includes(p.cat)).length}</div>
      </div>

      <button onClick={deleteAndSeed} disabled={loading} style={{marginTop:20, padding:'16px 22px', background: loading?'#94a3b8':'#dc2626', color:'white', borderRadius:12, fontWeight:900, border:0, cursor:'pointer', width:'100%', fontSize:15}}>
        {loading? `${step} ${done}/${FINAL_PRODUCTS.length}` : `🗑️ DELETE OLD + ADD ${FINAL_PRODUCTS.length} FINAL PRODUCTS`}
      </button>
      
      {msg && <div style={{marginTop:16, padding:14, background: msg.includes('✅')?'#dcfce7':'#fee2e2', borderRadius:10, fontSize:13, fontWeight:700, border:'1px solid #86efac'}}>{msg}</div>}

      <div style={{background:'white', border:'1px solid #e2e8f0', borderRadius:12, padding:16, marginTop:16, maxHeight:400, overflowY:'auto'}}>
        <div style={{fontSize:12, fontWeight:800, marginBottom:8}}>Preview - Final List with Buy/Sell/Stock/Min:</div>
        <table style={{width:'100%', fontSize:11, borderCollapse:'collapse'}}>
          <thead style={{background:'#0f172a', color:'white', position:'sticky', top:0}}><tr><th style={{padding:6, textAlign:'left'}}>Product</th><th>Cat</th><th>Buy</th><th>Sell</th><th>Stock</th><th>Min</th></tr></thead>
          <tbody>
            {FINAL_PRODUCTS.map((p,i)=><tr key={i} style={{borderBottom:'1px solid #f1f5f9'}}><td style={{padding:6}}>{p.name}</td><td style={{padding:6}}>{p.cat}</td><td style={{padding:6}}>{p.buy}</td><td style={{padding:6, fontWeight:700}}>{p.sell}</td><td style={{padding:6}}>{p.stock}</td><td style={{padding:6, color:'#dc2626', fontWeight:700}}>{p.min}</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}