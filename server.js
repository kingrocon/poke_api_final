
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const POKEMON_LIMIT = 1025;
const POKEMON_TYPES = [
    'normal', 'fire', 'water', 'grass', 'electric', 'ice',
    'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
    'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'
];
let primaryPokemonTypesRequest;

// Serve frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Backend API endpoint
app.get('/api/pokemon', async (req, res) => {
    try {
        const limit = Math.min(
            Math.max(parseInt(req.query.limit, 10) || POKEMON_LIMIT, 1),
            POKEMON_LIMIT
        );

        const response = await fetch(
            `https://pokeapi.co/api/v2/pokemon?limit=${limit}`
        );

        if (!response.ok) {
            throw new Error('Failed to fetch Pokemon list');
        }

        const data = await response.json();

        const pokemon = data.results.map((item) => ({
            id: Number(item.url.match(/\/(\d+)\/?$/)[1]),
            name: item.name,
            url: item.url
        }));

        res.json(pokemon);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: 'Unable to load Pokemon data'
        });
    }
});

app.get('/api/pokemon-types', async (req, res) => {
    try {
        if (!primaryPokemonTypesRequest) {
            primaryPokemonTypesRequest = Promise.all(
                POKEMON_TYPES.map(async (type) => {
                    const response = await fetch(
                        `https://pokeapi.co/api/v2/type/${type}`
                    );

                    if (!response.ok) {
                        throw new Error(`Failed to fetch ${type} Pokémon types`);
                    }

                    const data = await response.json();

                    return data.pokemon
                        .filter(({ slot }) => slot === 1)
                        .map(({ pokemon }) => ({
                            id: Number(pokemon.url.match(/\/(\d+)\/?$/)[1]),
                            type
                        }));
                })
            ).then((typesByType) => typesByType.flat());
        }

        res.json(await primaryPokemonTypesRequest);
    } catch (error) {
        primaryPokemonTypesRequest = undefined;
        console.error(error);
        res.status(500).json({
            error: 'Unable to load Pokémon type colors'
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
