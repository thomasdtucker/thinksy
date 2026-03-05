# Ships & Ship Parts (v2)

## Ships

Ships are the core identity mechanic. Every player selects **one ship** before a match. Ships remain in play the entire game and define playstyle.

### Ship Attributes
- **Hull (HP):** How much damage the ship can take before losing
- **Ability:** Passive effect active the entire game
- **Faction:** Determines card synergies
- **Equipment Slots:** Where ship parts are installed

### The 6 Ships

| ID | Ship | Faction | Hull | Ability | Rarity |
|----|------|---------|------|---------|--------|
| SH01 | Rustwind Scrapper | Scrappers | 20 | Units cost 1 less energy | Starter |
| SH02 | Void Skimmer | Void | 18 | Corrupted units gain +1 power | Starter |
| SH03 | Drift Hauler | Nomads | 22 | Gain extra cards from rift wins | Rare |
| SH04 | Bastion Frame | Sentinels | 24 | Units gain +1 health | Rare |
| SH05 | Rift Prowler | Wild | 19 | First fracture each turn costs 0 | Epic |
| SH06 | Starbreaker Hull | Void | 25 | Corrupted enemies deal -1 damage | Legendary |

### Ship Design Notes
- Lower hull = stronger ability (risk/reward)
- Starter ships are balanced for new players
- Higher rarity ships have unique build-around effects
- Ships never rotate out of the game

---

## Ship Part Slots (5)

### 1. Engine
Tempo, energy, and speed effects.

| ID | Part | Effect | Rarity | Compatible |
|----|------|--------|--------|------------|
| SP01 | Overcharged Engine Core | +1 energy each turn | Rare | All |
| SP02 | Rift Jump Engine | Draw 1 card on turn start | Rare | Void/Nomads |
| SP03 | Ion Thruster Bank | Units gain +1 attack first turn | Uncommon | Scrappers |
| SP16 | Drift Stabilizer | Reduce fracture effects | Uncommon | Nomads |
| SP19 | Nexus Pulse Reactor | Generate extra energy every 2 turns | Epic | All |

### 2. Weapon
Offensive amplification.

| ID | Part | Effect | Rarity | Compatible |
|----|------|--------|--------|------------|
| SP04 | Pulse Cannon Array | Ships gain +2 attack | Rare | All |
| SP05 | Corruption Beam Emitter | Corrupt enemy with highest power | Epic | Void |
| SP06 | Scrap Railgun | Units deal +1 damage to Nexus | Uncommon | Scrappers |
| SP17 | Gravity Lance | Pull strongest enemy to attack | Epic | All |

### 3. Shield
Protection and mitigation.

| ID | Part | Effect | Rarity | Compatible |
|----|------|--------|--------|------------|
| SP07 | Adaptive Shield Matrix | Ship takes -1 damage | Rare | All |
| SP08 | Rift Barrier Field | Prevent first fracture each game | Rare | Nomads |
| SP09 | Overload Reflector | Reflect 1 damage | Epic | Sentinels |

### 4. Sensor
Information and utility.

| ID | Part | Effect | Rarity | Compatible |
|----|------|--------|--------|------------|
| SP10 | Long Range Scanner | See opponent next draw | Uncommon | All |
| SP11 | Rift Mapping Array | Increase loot chance in Rift | Rare | Nomads |
| SP12 | Corruption Radar | Corrupted enemies revealed | Rare | Void |
| SP18 | Salvage Drone Bay | Gain bonus card after win | Rare | Scrappers |

### 5. Hull
Survivability and durability.

| ID | Part | Effect | Rarity | Compatible |
|----|------|--------|--------|------------|
| SP13 | Reinforced Hull Plates | Ship gains +5 health | Rare | All |
| SP14 | Void Reactive Armor | Corrupted damage reduced | Epic | Void |
| SP15 | Scrap Patch Framework | Heal 2 each turn | Rare | Scrappers |
| SP20 | Quantum Hull Core | Ship cannot drop below 1 HP once | Legendary | All |

---

## Slot Changes from v1

| v1 Slot | v2 Slot | Notes |
|---------|---------|-------|
| Reactor Core | — | Cut (energy handled by Engine) |
| Engine Assembly | Engine | Kept |
| Weapon System | Weapon | Kept |
| Shield Matrix | Shield | Kept |
| Command Uplink | Sensor | Renamed, focused on info/utility |
| Shard Interface | — | Cut (no Shard alignment system) |
| — | Hull | New slot for survivability |

## Faction Compatibility

Ship parts have **Compatible Ships** restrictions:
- **All** — works on any ship
- **Faction-specific** — only works on ships of that faction
- Some parts work on **2 factions** (e.g., Rift Jump Engine = Void/Nomads)
