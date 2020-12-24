$(document).ready(function () {
  $("#IV_table").hide();
  $("#CP_table").hide();
  $("#Raid_table").hide();
  $("#Catch_table").hide();
});

function myFunction() {
  var x = document.getElementById("myTopnav");
  if (x.className === "topnav") {
    x.className += " responsive";
  } else {
    x.className = "topnav";
  }
}

var pokemon_information = null;

$.getJSON("pokemon_information.json", function (data) {
  pokemon_information = data;

  let innerHTML = "";
  $.each(data["pms"], function (key, val) {
    innerHTML +=
      "<option value='" + val.nice_name + "'>" + val.nice_name + "</option>";
  });
  $("#IV_Pokemon")[0].innerHTML = innerHTML;
  $("#CP_Pokemon")[0].innerHTML = innerHTML;
  $("#Raid_Pokemon")[0].innerHTML = innerHTML;
  $("#Catch_Pokemon")[0].innerHTML = innerHTML;
});

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
    throw new Error("Unknown type.");
  }

  // Find the pokemon
  let pm = find_pokemon(name);
  if (!pm) {
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
  console.log(result);
  $("#Raid_table").show(500);
}
function CatchSubmit() {
  $("#Catch_table").show(500);
}
