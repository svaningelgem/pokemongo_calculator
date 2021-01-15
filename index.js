$(document).ready(function () {
  $("#IV_table").hide();
  $("#CP_table").hide();
  $("#Raid_table").hide();
  $("#Catch_table").hide();
  $("#CP_Evolve_Group").hide();
});

function responsiveTopbar() {
  var x = document.getElementById("myTopnav");
  if (x.className === "topnav") {
    x.className += " responsive";
  } else {
    x.className = "topnav";
  }
}

var hash = window.location.hash;
if (hash) {
  var item = $('.topnav a[href="' + hash + '"]')[0];
  if (item) {
    item.click();
  }
  var x = document.getElementById("myTopnav");
  if (x.className !== "topnav") {
    x.className = "topnav";
  }
}

$("input,select").on("change keyup", function (self) {
  save_to_localStorage(self.target);
});
$("input[type=radio]").on("click", function (self) {
  save_to_localStorage(self.target);
});

function clickTab(title, hash) {
  responsiveTopbar();
  $(".header-title").html(title);

  window.location.hash = hash;
}

var pokemon_information = null;

$.getJSON("pokemon_information.json", function (data) {
  pokemon_information = data;

  data["pms"].sort(sort_by_name);

  var pokemonData = [];
  $.each(data["pms"], function (key, val) {
    pokemonData.push(val.nice_name);
  });
  $("#IV_Pokemon").autocomplete({ source: pokemonData, delay: 100 });
  $("#CP_Pokemons").autocomplete({ source: pokemonData, delay: 100 });
  $("#Raid_Pokemons").autocomplete({ source: pokemonData, delay: 100 });
  $("#Catch_Pokemons").autocomplete({ source: pokemonData, delay: 100 });

  restoreData();
});

function restoreData() {
  for (let el of $("input,select")) {
    el = $(el);
    let value = localStorage.getItem(el.attr("name"));

    if (el.is(":checkbox")) {
      el.prop("checked", value === "true");
    } else if (el.is(":radio")) {
      el.prop("checked", value === el.val());
    } else {
      el.val(value);
    }
  }

  // Render the evolution box
  renderEvolve(localStorage.getItem("CP_Pokemon"));

  // Checkboxes are unchecked by default
  // --> Nothing to do here

  // Radio groups first item should be checked
  let all_radio_buttons = $("input[type=radio]");
  for (let el of all_radio_buttons) {
    el = $(el);
    let this_radio_group = all_radio_buttons.filter(
        "[name=" + el.attr("name") + "]"
    );
    if (this_radio_group.filter(":checked").length === 0) {
      // None checked... Check the current element
      el.prop("checked", true);
    }
  }
}

function calc_cp(pm, cp_multiplier, at, df, st) {
  // And the main calculation
  return Math.floor(
      ((pm.at + at) *
          Math.sqrt((pm.df + df) * (pm.st + st)) *
          cp_multiplier ** 2) /
      10
  );
}

function find_multiplier(lvl) {
  let cp_multiplier = pokemon_information["settings"]["player"]["cpMultiplier"];
  let level = Math.floor(lvl);
  let half_or_not = Math.floor((lvl - level) * 10.0) === 5.0;
  if (half_or_not) {
    let cp1 = cp_multiplier[level];
    let cp2 = cp_multiplier[level + 1];
    return Math.sqrt((cp1 ** 2 + cp2 ** 2) / 2);
  } else {
    return cp_multiplier[level];
  }
}

function find_pokemon(name) {
  name = name.toLowerCase();
  for (let pm of pokemon_information["pms"]) {
    if (pm.nice_name.toLowerCase() === name) {
      return pm;
    }
  }

  return null;
}

function find_pokemon2(name) {
  // Searches by 'name' and returns a full list
  name = name.toLowerCase();

  let result = [];
  for (let pm of pokemon_information["pms"]) {
    if (pm.name.toLowerCase() === name) {
      result.push(pm);
    }
  }

  return result;
}

function sort_by_name(a, b) {
  return (a.nice_name > b.nice_name) - (a.nice_name < b.nice_name);
}

function sort_by_iv_hp_etc(a, b) {
  let sort_by = ['iv', 'cp', 'at', 'df', 'st', 'hp'];
  for ( let sorting of sort_by ) {
    if (a[sorting] < b[sorting]) {
      return -1;
    }
    if (a[sorting] > b[sorting]) {
      return 1;
    }
  }

  return 0;
}

function get_unique_stardust_amounts() {
  return [...new Set(pokemon_information["upgrades"]["stardustCost"])].sort();
}

function get_possible_evolutions(name) {
  let pm = find_pokemon(name);
  if (!pm) {
    return [];
  }

  let evolutions = [];
  let to_process = [pm];
  while (to_process.length > 0) {
    let to_check = to_process.shift();
    evolutions.push(to_check);

    for (let ev of to_check.evolutions) {
      let pm2 = find_pokemon2(ev.evolution);
      to_process.push(...pm2);
    }
  }

  // Remove the first element (pm)... Because it's not an evolution of itself.
  evolutions.splice(0, 1);
  return evolutions;
}

function IVCalcSubmit(frm) {
  frm = $(frm);
  let name = frm.find("input.pokemon_selection").val();
  let cp = parseInt(frm.find("input.cp").val(), 10);
  let hp = parseInt(frm.find("input.hp").val(), 10);
  let stardust = parseInt(frm.find("input.stardust").val(), 10);
  let type = frm.find("input.type:checked").val();

  let levels = [];
  let min_at = 10,
      min_df = 10,
      min_st = 10;
  let weatherBonus = pokemon_information["settings"]["weather"]["raidEncounterCpBaseLevelBonus"];
  if (type === "raid") {
    levels = [
      pokemon_information["settings"]["player"]["maxEggPlayerLevel"], // normal
      pokemon_information["settings"]["player"]["maxEggPlayerLevel"] + weatherBonus
    ];
  } else if (type === "egg") {
    levels = [pokemon_information["settings"]["player"]["maxEggPlayerLevel"]];
  } else if (type === "quest") {
    levels = [
      pokemon_information["settings"]["player"]["maxQuestEncounterPlayerLevel"]
    ];
  } else if (type === "wild") {
    min_at = min_df = min_st = 0;

    let maxLevels = pokemon_information["settings"]["player"]["maxEncounterPlayerLevel"] + weatherBonus;
    levels = [];
    if (stardust) {
      let stardustCost = pokemon_information["settings"]["upgrades"]["stardustCost"];
      for ( let level of Array(maxLevels).keys() ) {
        if ( stardust === stardustCost[level] ) {
          levels.push(level + 1);
          levels.push(level + 1.5);
        }
      }
    }
    else { // It can be anything!
      let upgradesPerLevel = pokemon_information["settings"]["player"]["upgradesPerLevel"];
      levels = Array.from(Array(maxLevels * upgradesPerLevel - 1),
          function (x) {
            return 1 + x / upgradesPerLevel;
          }
      );
    }
  } else {
    $.notify("Unknown type!", "error");
    throw new Error("Unknown type.");
  }

  // Find the pokemon
  let pm = find_pokemon(name);
  if (!pm) {
    $.notify("Couldn't find '{name}'.", "error");
    throw new Error("Couldn't find '{name}'.");
  }

  let result = [];
  for (let lvl of levels) {
    let cp_multiplier = find_multiplier(lvl - 1); // Because we get levels 1-based, but the array is 0-based.
    let min_cp = calc_cp(pm, cp_multiplier, 0, 0, 0);
    if ( cp < min_cp ) continue;

    let max_cp = calc_cp(pm, cp_multiplier, 15, 15, 15);
    if ( cp > max_cp ) continue;

    for (let at = min_at; at <= 15; at++) {
      for (let df = min_df; df <= 15; df++) {
        for (let st = min_st; st <= 15; st++) {
          calculated_cp = calc_cp(pm, cp_multiplier, at, df, st);

          if (calculated_cp === cp) {
            calculated_hp = Math.floor(cp_multiplier * (pm.st + st));

            if ( hp && calculated_hp !== hp ) continue;

            result.push({
              at: at,
              df: df,
              st: st,
              lvl: lvl,
              cp: calculated_cp,
              hp: calculated_hp,
              iv: at + df + st,
              pct: (at + df + st) / 0.45
            });
          }
        }
      }
    }
  }
  // sort by iv desc, hp desc, at desc, df desc, st desc
  result.sort(sort_by_iv_hp_etc).reverse();
  let innerHTML = "";
  $.each(result, function (key, val) {
    innerHTML +=
        "<tr><td>" +
        cp +
        "</td><td>" +
        val.at + "/" + val.df + "/" + val.st +
        "</td><td>" +
        val.lvl +
        "</td><td>" +
        val.hp +
        "</td><td>" +
        val.iv +
        " / 45 (" +
        (Math.round(val.pct * 100) / 100).toFixed(2) +
        "%)</td></tr>";
  });
  let table = frm.find('table');
  table.find("tbody").html(innerHTML);
  table.show(500);

  return false;
}
function CatchSubmit() {
  $("#Catch_table").show(500);
}

function change_CP_Pokemon(self) {
  save_to_localStorage(self);
  renderEvolve($(self).val());
}

function renderEvolve(PokemonName) {
  if (!PokemonName) return;

  let innerHTML = "<option value='null'></option>";
  $.each(get_possible_evolutions(PokemonName), function (key, val) {
    innerHTML +=
        "<option value='" + encodeURIComponent(val.nice_name) + "'>" + val.nice_name + "</option>";
  });

  $("#CP_Evolve").html(innerHTML);
  $("#CP_Evolve_Group").show();
}

function save_to_localStorage(self) {
  self = $(self);
  let value = self.val();
  if (self.is(":checkbox")) {
    value = self.is(":checked") ? "true" : "false";
  }
  localStorage.setItem(self.attr("name"), value);
}

function refresh_tab(self) {
  self = $(self);
  let inputs = self.find("input,select");

  // Hide the table (assume it has the "table" class)
  let table = self.find("table.table");
  table.hide();
  table.find("tbody").html("");

  // Remove our entries from localStorage.
  for (let el of inputs) {
    localStorage.removeItem(el.name);
  }
  restoreData();
}
