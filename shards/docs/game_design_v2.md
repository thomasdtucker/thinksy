# Shards of the Nexus --- Game Design & Rulebook

## Overview

**Shards of the Nexus** is a collectible sci‑fi strategy card game where
players command scavenger ships exploring a fractured universe known as
**The Rift**. Players build decks of units, ship upgrades, and
reality-warping **Fracture events** to defeat opponents or AI bosses
while collecting new cards discovered during expeditions.

The design emphasizes:

-   Easy-to-learn combat rules
-   Ship customization that changes playstyle
-   Procedural progression through Rift exploration
-   Seasonal expansions that introduce new mechanics

The game can be played:

-   Player vs Player
-   Player vs AI
-   Rift Expedition Mode (PvE progression)

------------------------------------------------------------------------

# Core Gameplay Loop

1.  Players return to a **Rift Station**
2.  Build or modify their deck
3.  Equip ship parts
4.  Choose an expedition or match
5.  Battle opponents
6.  Discover new cards in the Rift

Winning Rift encounters may grant:

-   New unit cards
-   Ship parts
-   Fractures
-   Rare artifacts

------------------------------------------------------------------------

# Card Types

## Ship Cards

Every player selects **one ship** before a match begins.

Ships determine:

-   Starting hull (HP)
-   Ship abilities
-   Equipment slots
-   Playstyle bonuses

Example ship types:

-   Rustwind Scrapper (aggressive scavenger)
-   Void Skimmer (corruption mechanics)
-   Drift Hauler (loot-focused gameplay)
-   Bastion Frame (defensive builds)
-   Rift Prowler (fracture specialists)

Ships remain in play the entire game.

------------------------------------------------------------------------

## Unit Cards

Units are the main combat pieces deployed by players.

Attributes:

  Attribute     Meaning
  ------------- ----------------------------------
  Energy Cost   Energy required to play the unit
  Power         Attack damage
  Health        Hit points
  Ability       Special effect or passive

Units attack opposing units or the enemy ship.

------------------------------------------------------------------------

## Ship Part Cards

Ship parts modify ship abilities and deck synergy.

Possible slots:

-   Engine
-   Weapon
-   Shield
-   Sensor
-   Hull

Ship parts are extremely rare and dramatically change playstyle.

Example effects:

-   +1 energy per turn
-   Corrupt enemies
-   Reflect damage
-   Reveal opponent cards
-   Improve Rift loot chances

------------------------------------------------------------------------

## Fracture Cards

Fractures represent unstable rifts in reality.

They act similarly to spells but are themed as **cosmic anomalies**.

Examples:

-   Rift Surge -- draw cards
-   Gravity Collapse -- area damage
-   Warp Pull -- reposition enemies
-   Temporal Echo -- replay abilities

Fractures are **temporary events** that resolve instantly.

------------------------------------------------------------------------

## Rift Boss Cards

Bosses appear during Rift Expeditions.

Examples:

-   Void Leviathan
-   Rift Hydra
-   Devourer of Shards
-   Nexus Guardian

Boss battles grant high‑rarity rewards.

------------------------------------------------------------------------

# Core Combat Rules

## Objective

Reduce the opponent's **Ship Hull** to **0**.

------------------------------------------------------------------------

## Turn Structure

Each turn consists of:

1.  Draw Phase
2.  Energy Gain
3.  Play Cards
4.  Combat Phase
5.  End Phase

------------------------------------------------------------------------

## Energy System

Players gain **1 energy per turn**.

Unused energy does not carry over unless modified by ship parts.

------------------------------------------------------------------------

## Combat

Units attack once per turn.

Damage rules:

-   Unit → Unit: both deal damage simultaneously
-   Unit → Ship: ship loses health equal to power

Destroyed units go to the discard pile.

------------------------------------------------------------------------

# Deck Construction

Standard deck size:

30 cards

Deck limits:

-   Max 2 copies of common cards
-   Max 1 copy of legendary cards

Deck composition example:

-   20 Units
-   6 Fractures
-   4 Ship Parts

------------------------------------------------------------------------

# Rift Exploration Mode

Players can explore procedurally generated Rift encounters.

Encounter types:

-   Enemy scavengers
-   Corrupted fleets
-   Rift anomalies
-   Boss encounters

Winning encounters grants **loot cards**.

------------------------------------------------------------------------

# Card Rarity

  Rarity      Drop Rate
  ----------- -----------
  Common      60%
  Uncommon    25%
  Rare        10%
  Epic        4%
  Legendary   1%

Ship parts tend to appear in **Rare+ tiers**.

------------------------------------------------------------------------

# Strategy Archetypes

## Aggressive Scrapper

Fast units and nexus damage effects.

## Corruption Void Deck

Debuffs enemy units and spreads corruption.

## Nomad Rift Explorer

Focus on card draw and Rift rewards.

## Sentinel Defense

High-health units and defensive bonuses.

------------------------------------------------------------------------

# Design Philosophy

The game is built around three pillars:

### 1. Discoverability

Players should constantly discover new cards through Rift exploration.

### 2. Modular Progression

Ships and parts allow players to experiment with builds.

### 3. Seasonal Evolution

Each season introduces:

-   New factions
-   New ship parts
-   New Rift mechanics

------------------------------------------------------------------------

# Future Expansion Systems (Not in Core Spec)

These mechanics are intentionally excluded from the core prototype but
planned for future expansions:

-   Fusion Cards
-   Ship Part Fragments
-   Harness / Exo‑Suit Equipment
-   Player Trading Markets
-   Cooperative Boss Raids

------------------------------------------------------------------------

# AI Gameplay System

AI opponents use:

-   heuristic deck strategies
-   weighted decision trees
-   difficulty tiers

AI difficulty scaling:

  Difficulty   Behavior
  ------------ --------------------
  Easy         random plays
  Normal       basic strategy
  Hard         deck synergy
  Boss         scripted abilities

------------------------------------------------------------------------

# Data Model for Implementation

Each card requires:

-   Card ID
-   Name
-   Type
-   Faction
-   Energy Cost
-   Power
-   Health
-   Ability Text
-   Rarity
-   Slot Type (for parts)
-   Compatible Ships

------------------------------------------------------------------------

# Visual Card Layout

Cards contain:

Top Section: - mirrored stat row for opponent

Center: - artwork zone

Bottom: - card name - ability text - stat row

Cards are **25% taller than standard TCG cards**. The bottom section (player-facing)
side) is standard TCG height; the top adds a compact mirrored stat strip for the
opponent, accounting for the extra 25%.

------------------------------------------------------------------------

# Game Modes

### Duel Mode

Standard PvP match.

### AI Skirmish

Practice vs AI decks.

### Rift Expedition

PvE progression with card discovery.

### Boss Hunt

Challenge rare bosses for legendary cards.

------------------------------------------------------------------------

# Victory Conditions

A match ends when:

-   A ship reaches 0 hull
-   A player cannot draw a card
-   A boss is defeated

------------------------------------------------------------------------

# Summary

Shards of the Nexus combines:

-   deck‑building strategy
-   collectible card progression
-   RPG‑style exploration
-   modular ship customization

The Rift provides a narrative reason for **constant card discovery**,
ensuring long‑term replayability.
