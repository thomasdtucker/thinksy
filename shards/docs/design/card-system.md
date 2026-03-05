# Card System (v2)

## Card Types

### 1. Ship Cards
Every player selects **one ship** before a match begins. Ships remain in play the entire game.

Ships determine:
- Starting hull (HP)
- Ship abilities (passive effects)
- Equipment slots
- Playstyle bonuses

### 2. Unit Cards
Units are the main combat pieces deployed by players.

| Attribute | Meaning |
|-----------|---------|
| Energy Cost | Energy required to play |
| Power | Attack damage |
| Health | Hit points |
| Ability | Special effect or passive |

Units attack opposing units or the enemy ship.

### 3. Ship Part Cards
Ship parts modify ship abilities and deck synergy.

Slots: Engine, Weapon, Shield, Sensor, Hull

Ship parts are extremely rare and dramatically change playstyle.

### 4. Fracture Cards
Fractures represent unstable rifts in reality. They are **temporary events** that resolve instantly.

Themed as cosmic anomalies, not magic.

### 5. Rift Boss Cards (PvE only)
Bosses appear during Rift Expeditions. Boss battles grant high-rarity rewards.

## Energy System

- Players gain **+1 energy per turn**
- Unused energy does **not** carry over (unless modified by ship parts)
- Cards cost energy to play

## Combat Rules

### Objective
Reduce the opponent's **Ship Hull** to **0**.

### Turn Structure
1. **Draw Phase** — draw a card
2. **Energy Gain** — gain +1 energy
3. **Play Cards** — spend energy to deploy units, fractures, ship parts
4. **Combat Phase** — units attack
5. **End Phase** — turn passes

### Damage Rules
- **Unit vs Unit:** both deal damage simultaneously
- **Unit vs Ship:** ship loses health equal to unit's power
- Destroyed units go to the discard pile

## Deck Construction

- **Deck size:** 30 cards
- **Max 2 copies** of common cards
- **Max 1 copy** of legendary cards

### Recommended composition
- 20 Units
- 6 Fractures
- 4 Ship Parts

## Card Data Model

Each card has:
- Card ID, Name, Type, Faction
- Energy Cost, Power, Health
- Ability Text
- Rarity
- Slot Type (for parts)
- Compatible Ships

## Visual Card Layout

Cards are **50% taller than standard TCG cards** for mirrored readability.

| Section | Content |
|---------|---------|
| Top | Mirrored stat row (readable by opponent) |
| Center | Artwork zone |
| Bottom | Card name, ability text, stat row |
