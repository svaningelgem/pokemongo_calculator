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

$.getJSON("pokemon_information.json", function (data) {
  let innerHTML = "";
  $.each(data, function (key, val) {
    innerHTML +=
      "<option value='" + val.nice_name + "'>" + val.nice_name + "</option>";
  });
  $("#IV_Pokemon")[0].innerHTML = innerHTML;
  $("#CP_Pokemon")[0].innerHTML = innerHTML;
  $("#Raid_Pokemon")[0].innerHTML = innerHTML;
  $("#Catch_Pokemon")[0].innerHTML = innerHTML;
});

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
function RaidSubmit() {
  // if($("#Raid_op1")[0].checked)
  $("#Raid_table").show(500);
}
function CatchSubmit() {
  $("#Catch_table").show(500);
}
