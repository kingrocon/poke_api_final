let pokemonList = [];
let activePokemon = null;
let activePokemonEntry = null;
let activeRequest = 0;
let activeFormRequest = 0;
let moveRenderRequest = 0;
let activePokemonSpecies = null;
let pinnedPokemon = new Set();
let pokemonPrimaryTypes = new Map();

const pokemonDetails = new Map();
const moveDetails = new Map();
const evolutionChains = new Map();
const evolutionPokemonDetails = new Map();
const pokemonTypeColors = {
    normal: '#a8a77a',
    fire: '#ee8130',
    water: '#6390f0',
    grass: '#4caf50',
    electric: '#f7d02c',
    ice: '#96d9d6',
    fighting: '#c22e28',
    poison: '#a33ea1',
    ground: '#e2bf65',
    flying: '#a98ff3',
    psychic: '#f95587',
    bug: '#a6b91a',
    rock: '#b6a136',
    ghost: '#735797',
    dragon: '#6f35fc',
    dark: '#705746',
    steel: '#b7b7ce',
    fairy: '#d685ad'
};

try {
    const savedPins = JSON.parse(localStorage.getItem('pinnedPokemon') || '[]');

    if (Array.isArray(savedPins)) {
        pinnedPokemon = new Set(
            savedPins.filter(id => Number.isInteger(id) && id > 0)
        );
    }
} catch (error) {
    console.error('Could not load saved Pokémon pins.', error);
}

// Load Pokemon through Express backend
async function loadPokemon() {
    const summary = document.getElementById('resultSummary');
    summary.textContent = 'Loading Pokémon...';

    try {
        const response = await fetch('/api/pokemon?limit=1025');

        if (!response.ok) {
            throw new Error('Failed to load Pokémon');
        }

        pokemonList = await response.json();
        searchPokemon();

        try {
            const typeResponse = await fetch('/api/pokemon-types');

            if (!typeResponse.ok) {
                throw new Error('Failed to load Pokémon type colors');
            }

            const typeEntries = await typeResponse.json();
            pokemonPrimaryTypes = new Map(
                typeEntries.map(({ id, type }) => [id, type])
            );
            searchPokemon();
        } catch (error) {
            console.error('Could not color Pokémon cards by type.', error);
        }
    } catch (error) {
        console.error(error);
        summary.textContent = 'Could not load Pokémon. Please try again.';
    }
}

function searchPokemon() {
    const searchText = document
        .getElementById('search')
        .value.trim()
        .toLowerCase();
    const pinnedOnly = document.getElementById('pinnedOnly').getAttribute('aria-pressed') === 'true';

    const results = pokemonList.filter(pokemon =>
        (pokemon.name.includes(searchText) ||
            String(pokemon.id).includes(searchText)) &&
        (!pinnedOnly || pinnedPokemon.has(pokemon.id))
    );

    displayPokemon(results);
}

// SORT
function sortPokemon(list) {
    const sortType = document.getElementById('sort').value;

    return list.sort((a, b) => {
        if (sortType === 'number-asc') {
            return a.id - b.id;
        }

        if (sortType === 'number-desc') {
            return b.id - a.id;
        }

        if (sortType === 'za') {
            return b.name.localeCompare(a.name);
        }

        return a.name.localeCompare(b.name);
    });
}

function savePinnedPokemon() {
    try {
        localStorage.setItem(
            'pinnedPokemon',
            JSON.stringify([...pinnedPokemon])
        );
    } catch (error) {
        console.error('Could not save Pokémon pins.', error);
    }
}

function getPokemonDisplayName(name) {
    const displayNames = {
        'basculegion-male': 'Basculegion',
        'basculegion-female': 'Female Basculegion',
        'basculin-red-striped': 'Basculin',
        'basculin-blue-striped': 'Blue-Striped Basculin',
        'basculin-white-striped': 'White-Striped Basculin'
    };

    return displayNames[name] || name
        .split('-')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function updatePinButton(button, pokemon) {
    const isPinned = pinnedPokemon.has(pokemon.id);
    button.textContent = isPinned ? '★ Pinned' : '☆ Pin';
    button.setAttribute('aria-pressed', String(isPinned));
    button.setAttribute(
        'aria-label',
        `${isPinned ? 'Unpin' : 'Pin'} ${getPokemonDisplayName(pokemon.name)}`
    );
}

function togglePokemonPin(pokemon) {
    if (pinnedPokemon.has(pokemon.id)) {
        pinnedPokemon.delete(pokemon.id);
    } else {
        pinnedPokemon.add(pokemon.id);
    }

    savePinnedPokemon();
    searchPokemon();

    if (activePokemonEntry?.id === pokemon.id) {
        updatePinButton(
            document.getElementById('detailPinButton'),
            activePokemonEntry
        );
    }
}

// POKEMON CARDS
function displayPokemon(list = pokemonList) {
    const container = document.getElementById('pokemonList');
    const summary = document.getElementById('resultSummary');

    container.replaceChildren();

    const sortedList = sortPokemon([...list]);
    const pinnedCount = pinnedPokemon.size;

    summary.textContent =
        `${sortedList.length} Pokémon · ${pinnedCount} pinned`;

    sortedList.forEach(pokemon => {
        const wrapper = document.createElement('article');
        wrapper.className = 'pokemon-card';

        const card = document.createElement('button');
        card.className = 'card';
        card.type = 'button';
        const primaryType = pokemonPrimaryTypes.get(pokemon.id);

        if (primaryType) {
            card.style.setProperty(
                '--pokemon-type-color',
                pokemonTypeColors[primaryType] || '#d9433b'
            );
        }

        card.setAttribute(
            'aria-label',
            `Show details and moves for ${getPokemonDisplayName(pokemon.name)}`
        );

        const image = document.createElement('img');
        image.src =
            `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`;
        image.alt = getPokemonDisplayName(pokemon.name);
        image.loading = 'lazy';

        const title = document.createElement('h3');
        title.textContent = getPokemonDisplayName(pokemon.name);

        const number = document.createElement('p');
        number.textContent = `#${pokemon.id}`;

        card.append(image, title, number);
        card.addEventListener('click', () => {
            showPokemonDetails(pokemon);
        });

        const pinButton = document.createElement('button');
        pinButton.className = 'pin-button';
        pinButton.type = 'button';
        updatePinButton(pinButton, pokemon);
        pinButton.addEventListener('click', () => {
            togglePokemonPin(pokemon);
        });

        wrapper.append(card, pinButton);
        container.appendChild(wrapper);
    });
}

function findEvolutionNode(node, speciesName, parent = null) {
    if (node.species.name === speciesName) {
        return { node, parent };
    }

    for (const child of node.evolves_to) {
        const match = findEvolutionNode(child, speciesName, node);

        if (match) {
            return match;
        }
    }

    return null;
}

function getPokemonEntryForSpecies(species) {
    const pokemonId = Number(species.url.match(/\/(\d+)\/?$/)?.[1]);

    return pokemonList.find(pokemon => pokemon.name === species.name) ||
        pokemonList.find(pokemon => pokemon.id === pokemonId) || {
            id: pokemonId,
            name: species.name,
            url: `https://pokeapi.co/api/v2/pokemon/${pokemonId}/`
        };
}

function formatEvolutionName(name) {
    return name
        .split('-')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function describeEvolutionConditions(details) {
    const descriptions = [];

    details.forEach(detail => {
        const conditions = [];

        if (
            detail.trigger?.name &&
            !['level-up', 'use-item', 'recoil-damage'].includes(detail.trigger.name)
        ) {
            conditions.push(formatEvolutionName(detail.trigger.name));
        }

        if (detail.min_level != null) {
            conditions.push(`Reach level ${detail.min_level}`);
        }

        if (detail.min_happiness != null) {
            conditions.push(`Happiness ${detail.min_happiness} or higher`);
        }

        if (detail.min_affection != null) {
            conditions.push(`Affection ${detail.min_affection} or higher`);
        }

        if (detail.min_beauty != null) {
            conditions.push(`Beauty ${detail.min_beauty}+`);
        }

        if (detail.item) {
            conditions.push(`Use ${formatEvolutionName(detail.item.name)}`);
        }

        if (detail.held_item) {
            conditions.push(`Hold ${formatEvolutionName(detail.held_item.name)}`);
        }

        if (detail.time_of_day) {
            conditions.push(`During the ${detail.time_of_day}`);
        }

        if (detail.known_move) {
            conditions.push(`Know ${formatEvolutionName(detail.known_move.name)}`);
        }

        if (detail.known_move_type) {
            conditions.push(
                `Know a ${formatEvolutionName(detail.known_move_type.name)}-type move`
            );
        }

        if (detail.location) {
            conditions.push(`At ${formatEvolutionName(detail.location.name)}`);
        }

        if (detail.required_pokemon_form) {
            conditions.push(
                `Use ${formatEvolutionName(detail.required_pokemon_form.name)}`
            );
        }

        if (detail.min_damage_taken != null) {
            conditions.push(
                `Take ${detail.min_damage_taken} recoil damage`
            );
        }

        if (detail.needs_overworld_rain) {
            conditions.push('While it is raining');
        }

        if (detail.turn_upside_down) {
            conditions.push('Turn the device upside down');
        }

        if (detail.gender != null) {
            conditions.push(detail.gender === 1 ? 'Female' : 'Male');
        }

        if (detail.party_species) {
            conditions.push(
                `With ${formatEvolutionName(detail.party_species.name)} in the party`
            );
        }

        if (detail.party_type) {
            conditions.push(
                `With a ${formatEvolutionName(detail.party_type.name)}-type Pokémon in the party`
            );
        }

        if (detail.trade_species) {
            conditions.push(
                `Trade for ${formatEvolutionName(detail.trade_species.name)}`
            );
        }

        if (detail.relative_physical_stats != null) {
            const statCondition = {
                '-1': 'Attack lower than Defense',
                '0': 'Attack equal to Defense',
                '1': 'Attack higher than Defense'
            }[detail.relative_physical_stats];

            if (statCondition) {
                conditions.push(statCondition);
            }
        }

        if (conditions.length === 0 && detail.trigger?.name === 'level-up') {
            conditions.push('Level up');
        }

        descriptions.push(
            conditions.length
                ? conditions.join(' · ')
                : 'Condition not specified'
        );
    });

    return [...new Set(descriptions)];
}

function collectEvolutionPaths(
    node,
    path = [],
    incomingDetails = [],
    paths = []
) {
    const currentPath = [
        ...path,
        {
            species: node.species,
            conditions: describeEvolutionConditions(incomingDetails),
            requiredPokemonForm: null,
            evolvedPokemonForm: incomingDetails.find(
                detail => detail.evolved_pokemon_form
            )?.evolved_pokemon_form || null
        }
    ];

    if (node.evolves_to.length === 0) {
        paths.push(currentPath);
        return paths;
    }

    node.evolves_to.forEach(evolution => {
        const detailsByEvolvedForm = new Map();

        evolution.evolution_details.forEach(detail => {
            const formName = detail.evolved_pokemon_form?.name || '';

            if (!detailsByEvolvedForm.has(formName)) {
                detailsByEvolvedForm.set(formName, []);
            }

            detailsByEvolvedForm.get(formName).push(detail);
        });

        const detailGroups = detailsByEvolvedForm.size > 1
            ? [...detailsByEvolvedForm.values()]
            : [evolution.evolution_details];

        detailGroups.forEach(details => {
            const requiredPokemonForm = details.find(
                detail => detail.required_pokemon_form
            )?.required_pokemon_form || null;
            const pathWithRequiredForm = requiredPokemonForm
                ? currentPath.map((stage, index) =>
                    index === currentPath.length - 1
                        ? { ...stage, requiredPokemonForm }
                        : stage
                )
                : currentPath;

            collectEvolutionPaths(
                evolution,
                pathWithRequiredForm,
                details,
                paths
            );
        });
    });

    return paths;
}

async function getEvolutionPokemonDetail(entry) {
    if (!evolutionPokemonDetails.has(entry.id)) {
        const request = (async () => {
            const cached = pokemonDetails.get(entry.id);

            if (cached) {
                return cached;
            }

            const response = await fetch(entry.url);

            if (!response.ok) {
                throw new Error(`Unable to load ${entry.name} evolution details`);
            }

            const detail = await response.json();
            pokemonDetails.set(entry.id, detail);
            return detail;
        })();
        evolutionPokemonDetails.set(entry.id, request);
        request.catch(() => {
            evolutionPokemonDetails.delete(entry.id);
        });
    }

    return evolutionPokemonDetails.get(entry.id);
}

async function getEvolutionStageDetail(stage) {
    const pokemonForm =
        stage.evolvedPokemonForm || stage.requiredPokemonForm;

    if (pokemonForm?.url) {
        const formResponse = await fetch(pokemonForm.url);

        if (!formResponse.ok) {
            throw new Error(
                `Unable to load Pokémon form ${pokemonForm.name}`
            );
        }

        const form = await formResponse.json();
        const pokemonId = Number(form.pokemon.url.match(/\/(\d+)\/?$/)?.[1]);
        const formEntry = pokemonList.find(
            pokemon => pokemon.id === pokemonId
        ) || {
            id: pokemonId,
            name: form.pokemon.name,
            url: form.pokemon.url
        };

        return getEvolutionPokemonDetail(formEntry);
    }

    const entry = getPokemonEntryForSpecies(stage.species);
    return entry ? getEvolutionPokemonDetail(entry) : null;
}

async function renderEvolutionChain(chain, currentName, requestId) {
    const container = document.getElementById('evolutionChain');
    const status = document.getElementById('evolutionStatus');
    container.replaceChildren();

    const paths = collectEvolutionPaths(chain);
    const stages = new Map();
    paths.flat().forEach(stage => {
        const key =
            stage.evolvedPokemonForm?.name ||
            stage.requiredPokemonForm?.name ||
            stage.species.name;

        if (!stages.has(key)) {
            stages.set(key, stage);
        }
    });
    const availableStages = [...stages.entries()];
    const detailResults = await Promise.allSettled(
        availableStages.map(([, stage]) => getEvolutionStageDetail(stage))
    );

    if (requestId !== activeRequest) {
        return;
    }

    const detailsById = new Map();

    detailResults.forEach((result, index) => {
        const [stageKey] = availableStages[index];

        if (result.status === 'fulfilled') {
            detailsById.set(stageKey, result.value);
        } else {
            console.error(result.reason);
        }
    });

    paths.forEach(path => {
        const row = document.createElement('div');
        row.className = 'evolution-path';

        path.forEach((stage, index) => {
            const stageKey =
                stage.evolvedPokemonForm?.name ||
                stage.requiredPokemonForm?.name ||
                stage.species.name;
            const detail = detailsById.get(stageKey);
            const entry = detail
                ? { id: detail.id, name: detail.name }
                : getPokemonEntryForSpecies(stage.species);

            if (index > 0) {
                const step = document.createElement('div');
                step.className = 'evolution-step';

                const arrow = document.createElement('span');
                arrow.className = 'evolution-arrow';
                arrow.textContent = '→';
                step.appendChild(arrow);

                const conditions = stage.conditions.length
                    ? stage.conditions
                    : ['Condition not specified'];

                conditions.forEach((condition, conditionIndex) => {
                    if (conditionIndex > 0) {
                        const orLabel = document.createElement('span');
                        orLabel.className = 'evolution-or';
                        orLabel.textContent = 'or';
                        step.appendChild(orLabel);
                    }

                    const conditionLabel = document.createElement('span');
                    conditionLabel.className = 'evolution-condition';
                    conditionLabel.textContent = condition;
                    step.appendChild(conditionLabel);
                });

                row.appendChild(step);
            }

            const card = document.createElement('div');
            card.className = 'evolution-stage';

            if (stage.species.name === currentName) {
                card.classList.add('is-current');
                card.setAttribute('aria-current', 'step');
            }

            const stageLabel = document.createElement('span');
            stageLabel.className = 'evolution-stage-label';
            stageLabel.textContent = index === 0
                ? 'Base form'
                : `Stage ${index + 1}`;

            const image = document.createElement('img');
            image.src =
                `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${entry.id}.png`;
            image.alt = entry.name;
            image.loading = 'lazy';

            if (detail?.sprites.other?.['official-artwork']?.front_default) {
                image.src = detail.sprites.other['official-artwork'].front_default;
                image.style.imageRendering = 'auto';
            }

            image.addEventListener('error', () => {
                image.src =
                    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${entry.id}.png`;
                image.style.imageRendering = 'pixelated';
            }, { once: true });

            const name = document.createElement('span');
            name.className = 'evolution-stage-name';
            name.textContent = getPokemonDisplayName(entry.name);

            const types = document.createElement('div');
            types.className = 'evolution-stage-types';

            detail?.types.forEach(({ type }) => {
                const chip = document.createElement('span');
                chip.className = 'type-chip';
                chip.dataset.type = type.name;
                chip.textContent = type.name;
                types.appendChild(chip);
            });

            card.append(stageLabel, image, name, types);
            row.appendChild(card);
        });

        container.appendChild(row);
    });

    status.textContent = paths.length > 1
        ? `Evolution chain · ${paths.length} possible paths. Conditions are shown between Pokémon.`
        : 'Evolution chain · conditions are shown between Pokémon.';
}

async function loadEvolutionNavigation(detail, pokemon, requestId) {
    const previousButton = document.getElementById('previousPokemon');
    const nextButton = document.getElementById('nextPokemon');
    const choiceLabel = document.getElementById('nextEvolutionChoiceLabel');
    const choiceSelect = document.getElementById('nextEvolutionChoice');
    const status = document.getElementById('evolutionNavigationStatus');

    previousButton.disabled = true;
    nextButton.disabled = true;
    choiceLabel.hidden = true;
    choiceSelect.replaceChildren(
        new Option('Select an evolution...', '')
    );
    status.textContent = 'Loading evolution chain...';

    try {
        let chainRequest = evolutionChains.get(detail.species.name);

        if (!chainRequest) {
            chainRequest = (async () => {
                const speciesResponse = await fetch(detail.species.url);

                if (!speciesResponse.ok) {
                    throw new Error('Unable to load Pokémon species');
                }

                const species = await speciesResponse.json();
                const chainResponse = await fetch(species.evolution_chain.url);

                if (!chainResponse.ok) {
                    throw new Error('Unable to load Pokémon evolution chain');
                }

                return (await chainResponse.json()).chain;
            })();
            evolutionChains.set(detail.species.name, chainRequest);
            chainRequest.catch(() => {
                evolutionChains.delete(detail.species.name);
            });
        }

        const chain = await chainRequest;

        if (requestId !== activeRequest) {
            return;
        }

        renderEvolutionChain(chain, detail.species.name, requestId);
        const current = findEvolutionNode(chain, detail.species.name);

        if (!current) {
            status.textContent = 'Evolution information is not available.';
            return;
        }

        const previous = current.parent
            ? getPokemonEntryForSpecies(current.parent.species)
            : null;
        const requiredPreviousForm = current.node.evolution_details.find(
            detail => detail.required_pokemon_form
        )?.required_pokemon_form?.name || '';
        const nextEvolutions = current.node.evolves_to
            .map(evolution => ({
                name: evolution.species.name,
                pokemon: getPokemonEntryForSpecies(evolution.species)
            }))
            .filter(evolution => evolution.pokemon);

        previousButton.disabled = !previous;
        previousButton.dataset.pokemonId = previous?.id || '';
        previousButton.dataset.pokemonForm = requiredPreviousForm;

        if (nextEvolutions.length === 1) {
            nextButton.disabled = false;
            nextButton.dataset.pokemonId = nextEvolutions[0].pokemon.id;
            status.textContent = 'This Pokémon has one next evolution.';
        } else if (nextEvolutions.length > 1) {
            nextEvolutions.forEach(evolution => {
                choiceSelect.add(
                    new Option(evolution.name.replaceAll('-', ' '), evolution.pokemon.id)
                );
            });
            choiceLabel.hidden = false;
            nextButton.disabled = true;
            nextButton.dataset.pokemonId = '';
            status.textContent =
                `Choose one of ${nextEvolutions.length} possible evolutions.`;
        } else {
            nextButton.dataset.pokemonId = '';
            status.textContent = previous
                ? 'This is the final stage in its evolution chain.'
                : 'This Pokémon does not evolve.';
        }
    } catch (error) {
        console.error(error);

        if (requestId === activeRequest) {
            previousButton.disabled = true;
            nextButton.disabled = true;
            status.textContent =
                'Could not load evolution information. Please try again.';
        }
    }
}

function renderPokemonTypes(detail) {
    const container = document.getElementById('detailTypes');
    container.replaceChildren();
    const firstType = detail.types[0]?.type.name;
    const firstTypeColor = pokemonTypeColors[firstType] || '#d9433b';
    document.getElementById('pokemonDialog').style.borderTopColor =
        firstTypeColor;

    detail.types.forEach(({ type }) => {
        const chip = document.createElement('span');
        chip.className = 'type-chip';
        chip.dataset.type = type.name;
        chip.textContent = type.name;
        container.appendChild(chip);
    });

    if (detail.types.length === 0) {
        container.textContent = 'No type data available.';
    }
}

async function loadEncounterDetails(detail, requestId, formRequestId) {
    const summary = document.getElementById('encounterSummary');
    const container = document.getElementById('encounterDetails');
    summary.textContent = 'Loading encounter information...';
    container.replaceChildren();

    try {
        const response = await fetch(detail.location_area_encounters);

        if (!response.ok) {
            throw new Error('Unable to load encounter information');
        }

        const encounters = await response.json();

        if (
            requestId !== activeRequest ||
            (formRequestId !== undefined &&
                formRequestId !== activeFormRequest)
        ) {
            return;
        }

        const locationsByVersion = new Map();

        encounters.forEach(encounter => {
            encounter.version_details.forEach(({ version }) => {
                if (!locationsByVersion.has(version.name)) {
                    locationsByVersion.set(version.name, new Set());
                }

                locationsByVersion
                    .get(version.name)
                    .add(encounter.location_area.name);
            });
        });

        if (locationsByVersion.size === 0) {
            summary.textContent =
                'No encounter locations are listed by the PokéAPI.';
            return;
        }

        const formatName = name =>
            name
                .split('-')
                .map(part => part.charAt(0).toUpperCase() + part.slice(1))
                .join(' ');

        const versions = [...locationsByVersion.entries()]
            .sort(([first], [second]) => first.localeCompare(second));
        const totalLocations = new Set(
            [...locationsByVersion.values()].flatMap(locations => [...locations])
        ).size;

        summary.textContent =
            `Listed in ${versions.length} game versions across ${totalLocations} locations. Expand a game to see where to find it.`;

        versions.forEach(([version, locationNames]) => {
            const game = document.createElement('details');
            game.className = 'encounter-game';

            const gameSummary = document.createElement('summary');
            gameSummary.textContent = formatName(version);

            const locationCount = document.createElement('span');
            locationCount.className = 'encounter-location-count';
            locationCount.textContent =
                `${locationNames.size} ${locationNames.size === 1 ? 'location' : 'locations'}`;
            gameSummary.appendChild(locationCount);

            const locationList = document.createElement('ul');
            locationList.className = 'encounter-locations';

            [...locationNames]
                .sort((first, second) => first.localeCompare(second))
                .forEach(location => {
                    const item = document.createElement('li');
                    item.textContent = formatName(location);
                    locationList.appendChild(item);
                });

            game.append(gameSummary, locationList);
            container.appendChild(game);
        });
    } catch (error) {
        console.error(error);

        if (
            requestId === activeRequest &&
            (formRequestId === undefined ||
                formRequestId === activeFormRequest)
        ) {
            summary.textContent =
                'Could not load encounter information. Please try again.';
            container.replaceChildren();
        }
    }
}

function formatPokemonFormLabel(variety, speciesName) {
    if (variety.name === speciesName) {
        return 'Standard form';
    }

    const suffix = variety.name.startsWith(`${speciesName}-`)
        ? variety.name.slice(speciesName.length + 1)
        : variety.name;

    if (suffix === 'female' || suffix === 'male') {
        return `${suffix.charAt(0).toUpperCase()}${suffix.slice(1)} form`;
    }

    const regionalNames = {
        alola: 'Alolan',
        galar: 'Galarian',
        hisui: 'Hisuian',
        paldea: 'Paldean'
    };

    if (regionalNames[suffix]) {
        return `${regionalNames[suffix]} form`;
    }

    if (suffix === 'white-striped') {
        return 'White-Striped form';
    }

    return `${suffix
        .split('-')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')} form`;
}

function getPokemonFormDisplayName(variety, speciesName) {
    const displayName = getPokemonDisplayName(variety.name);

    if (
        variety.name !== speciesName &&
        (variety.name.startsWith(`${speciesName}-`)) &&
        ['basculegion-male', 'basculegion-female',
            'basculin-red-striped', 'basculin-blue-striped',
            'basculin-white-striped'].includes(variety.name)
    ) {
        return displayName;
    }

    const speciesDisplayName = speciesName.replaceAll('-', ' ');

    if (variety.name === speciesName) {
        return speciesDisplayName;
    }

    const formLabel = formatPokemonFormLabel(variety, speciesName)
        .replace(/ form$/i, '');
    return `${formLabel} ${speciesDisplayName}`;
}

function updatePokemonGenderAppearance(detail) {
    const genderSelectLabel = document.getElementById('genderSelectLabel');
    const genderSelect = document.getElementById('genderSelect');
    const hasFemaleSprite = Boolean(detail.sprites.front_female);

    genderSelectLabel.hidden = !hasFemaleSprite;
    genderSelect.replaceChildren(
        new Option('Male appearance', 'male'),
        new Option('Female appearance', 'female')
    );

    if (!hasFemaleSprite) {
        return;
    }

    genderSelect.value = 'male';
    genderSelect.dataset.frontMale = detail.sprites.front_default || '';
    genderSelect.dataset.frontFemale = detail.sprites.front_female;
    genderSelect.dataset.backMale = detail.sprites.back_default || '';
    genderSelect.dataset.backFemale = detail.sprites.back_female || '';
}

async function updatePokemonForm(variety, requestId) {
    const formRequestId = ++activeFormRequest;
    const status = document.getElementById('formStatus');
    const formId = Number(variety.pokemon.url.match(/\/(\d+)\/?$/)?.[1]);
    status.textContent = `Loading ${formatPokemonFormLabel(variety.pokemon, activePokemonSpecies.name).toLowerCase()}...`;

    try {
        let formDetail = pokemonDetails.get(formId);

        if (!formDetail) {
            const response = await fetch(variety.pokemon.url);

            if (!response.ok) {
                throw new Error(`Unable to load the ${variety.pokemon.name} form`);
            }

            formDetail = await response.json();
            pokemonDetails.set(formDetail.id, formDetail);
        }

        if (
            requestId !== activeRequest ||
            formRequestId !== activeFormRequest
        ) {
            return;
        }

        activePokemon = formDetail;
        const formLabel = formatPokemonFormLabel(
            variety.pokemon,
            activePokemonSpecies.name
        );
        document.getElementById('detailName').textContent =
            getPokemonFormDisplayName(
                variety.pokemon,
                activePokemonSpecies.name
            );

        const image = document.getElementById('detailImage');
        image.alt = document.getElementById('detailName').textContent;
        image.src =
            formDetail.sprites.other?.['official-artwork']?.front_default ||
            formDetail.sprites.front_default ||
            `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${formId}.png`;
        image.style.imageRendering =
            formDetail.sprites.other?.['official-artwork']?.front_default
                ? 'auto'
                : 'pixelated';
        renderPokemonTypes(formDetail);
        updatePokemonGenderAppearance(formDetail);
        loadEncounterDetails(formDetail, requestId, formRequestId);

        const versionFilter = document.getElementById('versionFilter');
        const versions = [
            ...new Set(
                formDetail.moves.flatMap(({ version_group_details }) =>
                    version_group_details.map(
                        ({ version_group }) => version_group.name
                    )
                )
            )
        ].sort();

        versionFilter.replaceChildren(
            new Option('All versions', '')
        );
        versions.forEach(version => {
            versionFilter.add(
                new Option(version.replaceAll('-', ' '), version)
            );
        });

        if (versions.length > 0) {
            versionFilter.value = versions[versions.length - 1];
        }

        renderPokemonMoves();
        status.textContent = `Showing ${formLabel.toLowerCase()}.`;
    } catch (error) {
        console.error(error);

        if (
            requestId === activeRequest &&
            formRequestId === activeFormRequest
        ) {
            status.textContent =
                'Could not load this form. Please choose another form or try again.';
        }
    }
}

async function loadPokemonForms(detail, requestId, preferredFormName = '') {
    const controls = document.getElementById('formControls');
    const formSelectLabel = document.getElementById('formSelectLabel');
    const formSelect = document.getElementById('formSelect');
    const genderSelectLabel = document.getElementById('genderSelectLabel');

    controls.hidden = true;
    formSelectLabel.hidden = true;
    genderSelectLabel.hidden = true;

    try {
        const response = await fetch(detail.species.url);

        if (!response.ok) {
            throw new Error('Unable to load Pokémon form information');
        }

        const species = await response.json();

        if (requestId !== activeRequest) {
            return;
        }

        activePokemonSpecies = species;
        const varieties = species.varieties;
        const initialVariety = varieties.find(
            variety => variety.pokemon.name === preferredFormName
        ) || varieties.find(
            variety => variety.pokemon.name === detail.name
        ) || varieties.find(variety => variety.is_default) || varieties[0];

        formSelect.replaceChildren();

        varieties.forEach(variety => {
            const option = new Option(
                formatPokemonFormLabel(variety.pokemon, species.name),
                variety.pokemon.name
            );
            formSelect.add(option);
        });

        formSelect.value = initialVariety.pokemon.name;
        formSelectLabel.hidden = varieties.length < 2;
        document.getElementById('detailName').textContent =
            getPokemonFormDisplayName(
                initialVariety.pokemon,
                species.name
            );
        updatePokemonGenderAppearance(detail);
        controls.hidden = varieties.length < 2 &&
            !detail.sprites.front_female;

        if (initialVariety.pokemon.name !== detail.name) {
            await updatePokemonForm(initialVariety, requestId);
        }
    } catch (error) {
        console.error(error);

        if (requestId === activeRequest) {
            document.getElementById('formStatus').textContent =
                'Could not load form options.';
        }
    }
}

// POKEMON DETAILS AND MOVES
async function showPokemonDetails(pokemon, preferredFormName = '') {
    const dialog = document.getElementById('pokemonDialog');
    const requestId = ++activeRequest;

    activePokemon = null;
    activePokemonEntry = pokemon;

    document.getElementById('detailName').textContent =
        getPokemonDisplayName(pokemon.name);
    document.getElementById('detailNumber').textContent = `#${pokemon.id}`;
    document.getElementById('formStatus').textContent = '';
    document.getElementById('formControls').hidden = true;
    document.getElementById('formSelectLabel').hidden = true;
    document.getElementById('genderSelectLabel').hidden = true;
    document.getElementById('formSelect').replaceChildren();
    document.getElementById('genderSelect').replaceChildren();
    activePokemonSpecies = null;
    const detailImage = document.getElementById('detailImage');
    detailImage.alt = getPokemonDisplayName(pokemon.name);
    detailImage.src =
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`;
    document.getElementById('moveStatus').textContent = 'Loading moves...';
    document.getElementById('moveRows').replaceChildren();
    document.getElementById('moveSearch').value = '';
    document.getElementById('detailTypes').textContent = 'Loading...';
    document.getElementById('encounterSummary').textContent =
        'Loading encounter information...';
    document.getElementById('encounterDetails').replaceChildren();

    updatePinButton(
        document.getElementById('detailPinButton'),
        pokemon
    );
    document.getElementById('evolutionStatus').textContent =
        'Loading evolution chain...';
    document.getElementById('evolutionChain').replaceChildren();
    document.getElementById('evolutionNavigationStatus').textContent =
        'Loading evolution chain...';
    document.getElementById('previousPokemon').disabled = true;
    document.getElementById('nextPokemon').disabled = true;
    document.getElementById('nextEvolutionChoiceLabel').hidden = true;

    document.getElementById('versionFilter').replaceChildren(
        new Option('All versions', '')
    );

    if (!dialog.open) {
        dialog.showModal();
    }

    try {
        let detail = pokemonDetails.get(pokemon.id);

        if (!detail) {
            const detailUrl =
                pokemon.url || `https://pokeapi.co/api/v2/pokemon/${pokemon.id}/`;
            const response = await fetch(detailUrl);

            if (!response.ok) {
                throw new Error('Unable to load Pokémon details');
            }

            detail = await response.json();
            pokemonDetails.set(pokemon.id, detail);
        }

        if (requestId !== activeRequest) {
            return;
        }

        loadEvolutionNavigation(detail, pokemon, requestId);
        activePokemon = detail;
        updatePokemonGenderAppearance(detail);
        loadPokemonForms(detail, requestId, preferredFormName);
        detailImage.src =
            detail.sprites.other?.['official-artwork']?.front_default ||
            detail.sprites.front_default ||
            `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`;
        renderPokemonTypes(detail);
        loadEncounterDetails(detail, requestId);

        const versions = [
            ...new Set(
                detail.moves.flatMap(({ version_group_details }) =>
                    version_group_details.map(
                        ({ version_group }) => version_group.name
                    )
                )
            )
        ].sort();

        const versionFilter = document.getElementById('versionFilter');

        versions.forEach(version => {
            versionFilter.add(
                new Option(version.replaceAll('-', ' '), version)
            );
        });

        if (versions.length > 0) {
            versionFilter.value = versions[versions.length - 1];
        }

        renderPokemonMoves();
    } catch (error) {
        console.error(error);

        if (requestId === activeRequest) {
            document.getElementById('moveStatus').textContent =
                'Could not load moves. Please try again.';
        }
    }
}

async function fetchMoveDetails(move) {
    if (!moveDetails.has(move.name)) {
        const request = fetch(move.url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Unable to load move: ${move.name}`);
                }

                return response.json();
            })
            .catch(error => {
                moveDetails.delete(move.name);
                throw error;
            });

        moveDetails.set(move.name, request);
    }

    return moveDetails.get(move.name);
}

function getMoveDescription(detail, selectedVersion) {
    const englishEntries = detail.flavor_text_entries.filter(
        entry => entry.language.name === 'en'
    );
    const description =
        englishEntries.find(
            entry => entry.version_group.name === selectedVersion
        ) || englishEntries[englishEntries.length - 1];

    return description
        ? description.flavor_text.replace(/[\n\f\r]+/g, ' ').trim()
        : 'No English description available.';
}

// SEARCH AND FILTER MOVES
async function renderPokemonMoves() {
    if (!activePokemon) {
        return;
    }

    const requestId = ++moveRenderRequest;
    const selectedVersion =
        document.getElementById('versionFilter').value;

    const searchText = document
        .getElementById('moveSearch')
        .value.trim()
        .toLowerCase();

    const moves = activePokemon.moves
        .flatMap(({ move, version_group_details }) =>
            version_group_details
                .filter(detail =>
                    (!selectedVersion ||
                        detail.version_group.name === selectedVersion) &&
                    move.name.includes(searchText)
                )
                .map(detail => ({
                    move,
                    method: detail.move_learn_method.name,
                    level: detail.level_learned_at,
                    version: detail.version_group.name
                }))
        )
        .sort((a, b) => a.move.name.localeCompare(b.move.name));

    const rows = document.getElementById('moveRows');
    rows.replaceChildren();

    if (moves.length === 0) {
        document.getElementById('moveStatus').textContent = 'No moves found.';
        return;
    }

    const uniqueMoves = [...new Map(
        moves.map(({ move }) => [move.name, move])
    ).values()];
    document.getElementById('moveStatus').textContent =
        `Loading details for ${uniqueMoves.length} moves...`;

    const detailsByName = new Map();
    let nextMoveIndex = 0;

    async function loadMoveDetails() {
        while (nextMoveIndex < uniqueMoves.length) {
            const move = uniqueMoves[nextMoveIndex];
            nextMoveIndex += 1;

            try {
                detailsByName.set(move.name, await fetchMoveDetails(move));
            } catch (error) {
                console.error(error);
                detailsByName.set(move.name, null);
            }
        }
    }

    await Promise.all(
        Array.from(
            { length: Math.min(8, uniqueMoves.length) },
            () => loadMoveDetails()
        )
    );

    if (requestId !== moveRenderRequest || !activePokemon) {
        return;
    }

    moves.forEach(move => {
        const detail = detailsByName.get(move.move.name);
        const row = document.createElement('tr');
        const values = [
            move.move.name.replaceAll('-', ' '),
            detail?.type.name.replaceAll('-', ' ') || 'Unavailable',
            detail?.power ?? '—',
            detail?.accuracy === null || detail?.accuracy === undefined
                ? '—'
                : `${detail.accuracy}%`,
            detail
                ? getMoveDescription(detail, selectedVersion)
                : 'Move details unavailable.',
            move.method.replaceAll('-', ' '),
            move.level || '—',
            move.version.replaceAll('-', ' ')
        ];

        values.forEach((value, index) => {
            const cell = document.createElement('td');
            cell.textContent = value;

            if (index === 4) {
                cell.className = 'move-description';
            }

            row.appendChild(cell);
        });

        rows.appendChild(row);
    });

    document.getElementById('moveStatus').textContent =
        `${moves.length} moves found`;
}

// EVENT LISTENERS
document.getElementById('closeDialog').addEventListener('click', () => {
    document.getElementById('pokemonDialog').close();
});

document.getElementById('detailPinButton').addEventListener('click', () => {
    if (activePokemonEntry) {
        togglePokemonPin(activePokemonEntry);
    }
});

document.getElementById('previousPokemon').addEventListener('click', () => {
    const pokemonId = Number(
        document.getElementById('previousPokemon').dataset.pokemonId
    );
    const previous = pokemonList.find(pokemon => pokemon.id === pokemonId);

    if (previous) {
        showPokemonDetails(
            previous,
            document.getElementById('previousPokemon').dataset.pokemonForm
        );
    }
});

document.getElementById('nextPokemon').addEventListener('click', () => {
    const pokemonId = Number(
        document.getElementById('nextEvolutionChoice').value ||
            document.getElementById('nextPokemon').dataset.pokemonId
    );
    const next = pokemonList.find(pokemon => pokemon.id === pokemonId);

    if (next) {
        showPokemonDetails(next);
    }
});

document.getElementById('nextEvolutionChoice').addEventListener(
    'change',
    event => {
        document.getElementById('nextPokemon').disabled =
            !event.currentTarget.value;
    }
);

document.getElementById('versionFilter').addEventListener(
    'change',
    renderPokemonMoves
);

document.getElementById('formSelect').addEventListener(
    'change',
    async event => {
        if (!activePokemonSpecies) {
            return;
        }

        const variety = activePokemonSpecies.varieties.find(
            entry => entry.pokemon.name === event.currentTarget.value
        );

        if (variety) {
            await updatePokemonForm(
                variety,
                activeRequest
            );
        }
    }
);

document.getElementById('genderSelect').addEventListener(
    'change',
    event => {
        const select = event.currentTarget;
        const isFemale = select.value === 'female';
        const sprite = isFemale
            ? select.dataset.frontFemale
            : select.dataset.frontMale;

        if (sprite) {
            const image = document.getElementById('detailImage');
            image.src = sprite;
            image.style.imageRendering = 'pixelated';
            image.alt = `${document.getElementById('detailName').textContent} (${isFemale ? 'female' : 'male'} appearance)`;
        }
    }
);

document.getElementById('moveSearch').addEventListener(
    'input',
    renderPokemonMoves
);

document.getElementById('search').addEventListener(
    'input',
    searchPokemon
);

document.getElementById('sort').addEventListener(
    'change',
    searchPokemon
);

document.getElementById('pinnedOnly').addEventListener('click', event => {
    const button = event.currentTarget;
    const isShowingPinned = button.getAttribute('aria-pressed') === 'true';
    button.setAttribute('aria-pressed', String(!isShowingPinned));
    searchPokemon();
});

// START
loadPokemon();
