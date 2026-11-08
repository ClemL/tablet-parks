'use client';

import { createContext, useContext } from 'react';
import type { GearCard } from '@/game/types';
import type { Pokemon } from '@/room/names';
import { PokemonHead } from '@/art/pokemon';
import { GearArt, hasGearArt } from '@/art/gear';

/*
 * REI's goods dressed as Pokémon gear, when the table leaves it on: each card
 * gets the Pokémon it suits best and a name to match — Squirtle’s Water
 * Filter, Snorlax’s Sleeping Bag — and that Pokémon stands beside the card.
 * Gear with no natural owner goes to Ditto, who can be anything. Looks only:
 * the rules, the log and the cards' ids are untouched.
 */
export const GEAR_POKEMON: Record<string, { pokemon: Pokemon; name: string }> = {
  boots: { pokemon: 'Bulbasaur', name: 'Bulbasaur’s Hiking Boots' },
  poles: { pokemon: 'Diglett', name: 'Diglett’s Trekking Poles' },
  filter: { pokemon: 'Squirtle', name: 'Squirtle’s Water Filter' },
  binoculars: { pokemon: 'Eevee', name: 'Eevee’s Binoculars' },
  sunhat: { pokemon: 'Pikachu', name: 'Pikachu’s Sun Hat' },
  'sleeping-bag': { pokemon: 'Snorlax', name: 'Snorlax’s Sleeping Bag' },
  tripod: { pokemon: 'Ditto', name: 'Ditto’s Tripod' },
  album: { pokemon: 'Jigglypuff', name: 'Jigglypuff’s Photo Album' },
  'trail-map': { pokemon: 'Togepi', name: 'Togepi’s Trail Map' },
  'spare-flask': { pokemon: 'Vulpix', name: 'Vulpix’s Sun Flask' },
  'spare-stone': { pokemon: 'Clefairy', name: 'Clefairy’s Moon Stone Flask' },
  'park-pass': { pokemon: 'Meowth', name: 'Meowth’s Annual Park Pass' },
  daypack: { pokemon: 'Psyduck', name: 'Psyduck’s Daypack' },
};

const GearTheme = createContext(true);

/** Set once per screen from the table's setting; every gear card below reads it. */
export const GearThemeProvider = GearTheme.Provider;

/** The Pokémon a card goes to: its own, or Ditto for anything without one. */
export function gearPokemon(card: Pick<GearCard, 'id'>): Pokemon {
  return GEAR_POKEMON[card.id]?.pokemon ?? 'Ditto';
}

/** What a gear card is called on this table. */
export function gearName(card: Pick<GearCard, 'id' | 'name'>, themed: boolean): string {
  if (!themed) return card.name;
  return GEAR_POKEMON[card.id]?.name ?? `Ditto’s ${card.name}`;
}

/** The card's name as this table calls it, for any component under the provider. */
export function useGearName(): (card: Pick<GearCard, 'id' | 'name'>) => string {
  const themed = useContext(GearTheme);
  return (card) => gearName(card, themed);
}

/**
 * A gear card's picture: its drawn illustration (the card's emoji only for a
 * card nobody has drawn yet), and with the theme on, the Pokémon using it
 * standing just beside.
 */
export function GearIcon({ card, className = '' }: { card: Pick<GearCard, 'id' | 'icon'>; className?: string }) {
  const themed = useContext(GearTheme);
  return (
    <span className={`gear-icon${themed ? ' gear-icon--pk' : ''}${className ? ` ${className}` : ''}`} aria-hidden="true">
      <span className="gear-icon__item">{hasGearArt(card.id) ? <GearArt id={card.id} /> : card.icon}</span>
      {themed ? <PokemonHead name={gearPokemon(card)} className="gear-icon__pk" /> : null}
    </span>
  );
}
