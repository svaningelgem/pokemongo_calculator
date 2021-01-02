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

function clickTab(title, hash) {
  responsiveTopbar();
  $(".header-title")[0].innerHTML = title;

  window.location.hash = hash;
}

var pokemon_information = null;

$.getJSON("pokemon_information.json", function (data) {
  pokemon_information = data;

  data["pms"].sort(sort_by_name);
  let innerHTML = "";
  $.each(data["pms"], function (key, val) {
    innerHTML += "<option value='" + val.nice_name + "'>";
  });
  $("#IV_Pokemons")[0].innerHTML = innerHTML;
  $("#CP_Pokemons")[0].innerHTML = innerHTML;
  $("#Raid_Pokemons")[0].innerHTML = innerHTML;
  $("#Catch_Pokemons")[0].innerHTML = innerHTML;

  restoreData();
});

function restoreData() {
  $("#IV_Pokemon").val(localStorage.getItem("IV_Pokemon"));
  $("#CP_Pokemon").val(localStorage.getItem("CP_Pokemon"));
  $("#Raid_Pokemon").val(localStorage.getItem("Raid_Pokemon"));
  $("#Catch_Pokemon").val(localStorage.getItem("Catch_Pokemon"));

  $("#Raid_CP").val(localStorage.getItem("Raid_CP"));

  switch (localStorage.getItem("Raid_Type")) {
    case "egg":
      $("#raid").prop("checked", false);
      $("#egg").prop("checked", true);
      $("#quest").prop("checked", false);
      break;
    case "quest":
      $("#raid").prop("checked", false);
      $("#egg").prop("checked", false);
      $("#quest").prop("checked", true);
      break;

    default:
      $("#raid").prop("checked", true);
      $("#egg").prop("checked", false);
      $("#quest").prop("checked", false);
      break;
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
  for (let pm of pokemon_information["pms"]) {
    if (pm.nice_name === name) {
      return pm;
    }
  }

  return null;
}

function find_pokemon2(name) {
  // Searches by 'name' and returns a full list
  let result = [];
  for (let pm of pokemon_information["pms"]) {
    if (pm.name === name) {
      result.push(pm);
    }
  }

  return result;
}

function IVSubmit() {
  // $("#IV_Pokemon")[0].value
  // $("#IV_CP")[0].value
  // $("#IV_HP")[0].value
  // $("#IV_Stardust")[0].value
  // $("#IV_Hatched")[0].checked
  // $("#IV_Lucky")[0].checked
  $("#IV_table").show(500);
}

function CPSubmit() {
  $("#CP_table").show(500);
}

function sort_by_name(a, b) {
  return (a.nice_name > b.nice_name) - (a.nice_name < b.nice_name);
}

function sort_by_iv_hp_etc(a, b) {
  // First by IV
  if (a.iv < b.iv) {
    return -1;
  }
  if (a.iv > b.iv) {
    return 1;
  }

  // Then by HP
  if (a.hp < b.hp) {
    return -1;
  }
  if (a.hp > b.hp) {
    return 1;
  }

  // Then by at
  if (a.at < b.at) {
    return -1;
  }
  if (a.at > b.at) {
    return 1;
  }

  // Then by df
  if (a.df < b.df) {
    return -1;
  }
  if (a.df > b.df) {
    return 1;
  }

  // Then by st
  if (a.st < b.st) {
    return -1;
  }
  if (a.st > b.st) {
    return 1;
  }

  return 0;
}

function sort_desc_by_iv_hp_etc(a, b) {
  return -1 * sort_by_iv_hp_etc(a, b);
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

function RaidSubmit() {
  let name = $("#Raid_Pokemon").val();
  let cp = parseInt($("#Raid_CP").val(), 10);
  let type = $("input[name=Raid_type]:checked").val();

  let levels = [];
  if (type === "raid") {
    levels = [
      pokemon_information["settings"]["player"]["maxEggPlayerLevel"], // normal
      pokemon_information["settings"]["player"]["maxEggPlayerLevel"] + // weather boosted
        pokemon_information["settings"]["weather"][
          "raidEncounterCpBaseLevelBonus"
        ]
    ];
  } else if (type === "egg") {
    levels = [pokemon_information["settings"]["player"]["maxEggPlayerLevel"]];
  } else if (type === "quest") {
    levels = [
      pokemon_information["settings"]["player"]["maxQuestEncounterPlayerLevel"]
    ];
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

    for (let at = 10; at <= 15; at++) {
      for (let df = 10; df <= 15; df++) {
        for (let st = 10; st <= 15; st++) {
          if (calc_cp(pm, cp_multiplier, at, df, st) === cp) {
            result.push({
              at: at,
              df: df,
              st: st,
              hp: Math.floor(cp_multiplier * (pm.st + st)),
              iv: at + df + st,
              pct: (at + df + st) / 0.45
            });
          }
        }
      }
    }
  }
  // sort by iv desc, hp desc, at desc, df desc, st desc
  result.sort(sort_desc_by_iv_hp_etc);
  let innerHTML = "";
  $.each(result, function (key, val) {
    innerHTML +=
      "<tr><td>" +
      cp +
      "</td>" +
      "<td>" +
      val.at +
      "</td>" +
      "<td>" +
      val.df +
      "</td>" +
      "<td>" +
      val.st +
      "</td>" +
      "<td>" +
      val.hp +
      "</td>" +
      "<td>" +
      val.iv +
      "</td>" +
      "<td>" +
      (Math.round(val.pct * 100) / 100).toFixed(2) +
      "</td></tr>";
  });
  $("#Raid_table_body")[0].innerHTML = innerHTML;
  $("#Raid_table").show(500);
}
function CatchSubmit() {
  $("#Catch_table").show(500);
}

function change_IV_Pokemon() {
  localStorage.setItem("IV_Pokemon", $("#IV_Pokemon").val());
}
function change_CP_Pokemon() {
  localStorage.setItem("CP_Pokemon", $("#CP_Pokemon").val());
  let innerHTML = "";
  $.each(get_possible_evolutions($("#CP_Pokemon").val()), function (key, val) {
    innerHTML += "<option value='" + val.name + "'>" + val.name + "</option>";
  });
  $("#CP_Evolve")[0].innerHTML = innerHTML;
  $("#CP_Evolve_Group").show();
}
function change_Raid_Pokemon() {
  localStorage.setItem("Raid_Pokemon", $("#Raid_Pokemon").val());
}
function change_Catch_Pokemon() {
  localStorage.setItem("Catch_Pokemon", $("#Catch_Pokemon").val());
}

function change_Raid_CP() {
  localStorage.setItem("Raid_CP", $("#Raid_CP").val());
}

function change_Raid_Type(element) {
  localStorage.setItem("Raid_Type", element);
}

function refresh_Raid() {
  $("#Raid_table").hide();
  localStorage.removeItem("Raid_Pokemon");
  localStorage.removeItem("Raid_CP");
  localStorage.removeItem("Raid_Type");
  $("#Raid_table_body")[0].innerHTML = "";
  restoreData();
}
