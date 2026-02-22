/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { GameEngine } from './game/Engine';
import { Upgrade } from './game/Upgrades';
import { motion, AnimatePresence } from 'motion/react';
import { Crosshair, Zap, Skull, ShieldAlert, Play, RotateCcw } from 'lucide-react';

export default function App() {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'levelup' | 'gameover' | 'victory'>('menu');
  const [upgrades, setUpgrades] = useState<Upgrade[]>([]);
  const [score, setScore] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (gameState === 'playing' && canvasRef.current && !engineRef.current) {
      engineRef.current = new GameEngine(canvasRef.current, {
        onLevelUp: (choices: Upgrade[]) => {
          setUpgrades(choices);
          setGameState('levelup');
        },
        onGameOver: () => setGameState('gameover'),
        onVictory: () => setGameState('victory'),
        onScoreUpdate: (s: number) => setScore(s)
      });
      engineRef.current.start();
    }
    
    return () => {
      if (gameState !== 'playing' && gameState !== 'levelup' && engineRef.current) {
        engineRef.current.stop();
        engineRef.current = null;
      }
    }
  }, [gameState]);

  const handleUpgradeSelect = (upgrade: Upgrade) => {
    if (engineRef.current) {
      engineRef.current.applyUpgrade(upgrade);
      engineRef.current.resume();
      setGameState('playing');
    }
  };

  const startGame = () => setGameState('playing');

  return (
    <div className="relative w-full h-screen overflow-hidden bg-zinc-950 text-zinc-100 font-sans">
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full block"
      />

      {/* HUD */}
      {gameState === 'playing' && (
        <div className="absolute top-4 left-4 pointer-events-none">
          <div className="bg-zinc-900/80 backdrop-blur-md px-4 py-2 rounded-xl border border-zinc-800 shadow-lg">
            <span className="text-zinc-400 text-sm font-medium uppercase tracking-wider">Score</span>
            <div className="text-2xl font-mono font-bold text-emerald-400">{score}</div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {gameState === 'menu' && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm"
          >
            <div className="text-center space-y-8 max-w-md p-8 bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl">
              <div className="space-y-4">
                <h1 className="text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-emerald-400 to-cyan-500">
                  SNAKE<br/>SURVIVOR
                </h1>
                <p className="text-zinc-400">
                  A 1000-segment monstrosity approaches. You cannot move. Build synergies and survive.
                </p>
              </div>
              <button 
                onClick={startGame}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-lg rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" />
                Start Protocol
              </button>
            </div>
          </motion.div>
        )}

        {gameState === 'levelup' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }}
            className="absolute inset-0 flex items-center justify-center bg-zinc-950/90 backdrop-blur-md z-50"
          >
            <div className="w-full max-w-4xl p-8 space-y-8">
              <div className="text-center space-y-2">
                <h2 className="text-4xl font-black tracking-tight text-emerald-400">SYSTEM UPGRADE</h2>
                <p className="text-zinc-400 uppercase tracking-widest text-sm">Select one enhancement</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {upgrades.map((u, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.05, y: -5 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleUpgradeSelect(u)}
                    className="flex flex-col items-start p-6 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-emerald-500 hover:shadow-[0_0_30px_rgba(16,185,129,0.2)] transition-all text-left group"
                  >
                    <div className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full mb-4 ${
                      u.rarity === 'common' ? 'bg-zinc-800 text-zinc-300' :
                      u.rarity === 'rare' ? 'bg-blue-900/50 text-blue-400' :
                      u.rarity === 'epic' ? 'bg-purple-900/50 text-purple-400' :
                      'bg-amber-900/50 text-amber-400'
                    }`}>
                      {u.rarity}
                    </div>
                    <h3 className="text-xl font-bold text-zinc-100 mb-2 group-hover:text-emerald-400 transition-colors">{u.name}</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed">{u.description}</p>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {(gameState === 'gameover' || gameState === 'victory') && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center bg-zinc-950/90 backdrop-blur-md z-50"
          >
            <div className="text-center space-y-8 max-w-md p-8 bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl">
              <div className="space-y-4">
                {gameState === 'victory' ? (
                  <h2 className="text-6xl font-black tracking-tighter text-emerald-400">VICTORY</h2>
                ) : (
                  <h2 className="text-6xl font-black tracking-tighter text-red-500">DEFEATED</h2>
                )}
                <p className="text-zinc-400 text-lg">
                  Final Score: <span className="font-mono font-bold text-zinc-100">{score}</span>
                </p>
              </div>
              <button 
                onClick={() => setGameState('menu')}
                className="w-full py-4 bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-lg rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-5 h-5" />
                Return to Menu
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
