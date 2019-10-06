const $ = require("jquery");
const bigInt = require("./BigInteger.min.js");
window.lettersOnly = function (e) {
  key = e.keyCode || e.which;
  tecla = String.fromCharCode(key).toLowerCase();
  letters = " áéíóúabcdefghijklmnñopqrstuvwxyz-";
  especials = "8-37-39-46";

  tecla_especial = false
  for (var i in especials) {
    if (key == especials[i]) {
      tecla_especial = true;
      break;
    }
  }

  if (letters.indexOf(tecla) == -1 && !tecla_especial) {
    return false;
  }
}

window.numbersOnly = function (e) {
  key = e.keyCode || e.which;
  tecla = String.fromCharCode(key).toLowerCase();
  letters = "1234567890";
  especials = "8-37-39-46";

  tecla_especial = false
  for (var i in especials) {
    if (key == especials[i]) {
      tecla_especial = true;
      break;
    }
  }

  if (letters.indexOf(tecla) == -1 && !tecla_especial) {
    return false;
  }
}

window.hexOnly = function (e) {
  key = e.keyCode || e.which;
  tecla = String.fromCharCode(key).toLowerCase();
  letters = "abcdefx1234567890";
  especials = "8-37-39-46";

  tecla_especial = false
  for (var i in especials) {
    if (key == especials[i]) {
      tecla_especial = true;
      break;
    }
  }

  if (letters.indexOf(tecla) == -1 && !tecla_especial) {
    return false;
  }
}

window.clean = function () {
  document.getElementById("imgSelected").value = "";
  cleanValidations();
}

window.cleanValidation = function () {
  var cleanV = document.getElementsByClassName('was-validated');
  Array.prototype.filter.call(cleanV, function (cleaning) {
    cleaning.classList.remove('was-validated');
  })
}

window.cleanValidations = function () {
  var times = document.getElementsByClassName('was-validated').length;
  for (var i = 0; i < times; i++) cleanValidation();
}

window.validate = function (classToValidate, event) {
  cleanValidations();
  var forms = document.getElementsByClassName(classToValidate);
  Array.prototype.filter.call(forms, function (form) {
    var inputForms = form.getElementsByTagName('select');
    Array.prototype.filter.call(inputForms, function (inputs) {
      if (inputs.checkValidity() === false) {
        event.preventDefault();
      }
      form.classList.add('was-validated');
    })
  })
  Array.prototype.filter.call(forms, function (form) {
    var inputForms = form.getElementsByTagName('input');
    Array.prototype.filter.call(inputForms, function (inputs) {
      if (inputs.checkValidity() === false) {
        event.stopPropagation();
      }
      form.classList.add('was-validated');
    })
  })
}

document.getElementById('hashIt').addEventListener('click', function (event) {
  validate('hashClass', event)
});
document.getElementById('deposit').addEventListener('click', function (event) {
  validate('depositClass', event)
});
document.getElementById('withdraw').addEventListener('click', function (event) {
  validate('withdrawClass', event)
});
document.getElementById('reclaim').addEventListener('click', function (event) {
  validate('reclaimClass', event)
});

window.validateBigAmount = function (field) {
  var value = document.getElementById(field).value;
  var isValidated = bigInt(value).greater(1);
  if (isValidated == true) {
    document.getElementById(field).setCustomValidity('');
  } else {
    document.getElementById(field).setCustomValidity('Must be greater than 2', (event) => {
      event.preventDefault();
    });
  }
}


window.showAlert = function (field, message, time) {
  if (time == null) {
    _time = 5000;
  } else {
    _time = time * 1000;
  }
  $(field).append(`<div id="alertWarning" style="overflow-wrap: break-word; padding:0" class="scene_element fadeInDown col-12 text-center"><div class="alert alert-danger alert-dismissible fade show" role="alert">
    <strong>${message}
    <button type="button" class="close" data-dismiss="alert" aria-label="Close">
      <span aria-hidden="true">&times;</span>
    </button>
  </div>
  </div>`);
  $("#alertWarning").delay(_time).fadeOut(0, function () {
    //$(this).removeClass('fadeInDown');
    $(this).addClass('fadeOutUp');
    document.getElementById("alertWarning").setAttribute("style", "display:true");
    //$(this).remove();  
    $("#alertWarning").delay(300).fadeOut(0, function () {
      $(this).remove();
    });
  });
}

window.showSuccess = function (field, message, time) {
  if (time == null) {
    _time = 5000;
  } else {
    _time = time * 1000;
  }
  $(field).append(`
  <div id="successAlert" class="scene_element fadeInDown col-12 text-center" style="overflow-wrap: break-word; padding:0">
    <div class="alert alert-success alert-dismissible fade show" role="alert">
      <strong>${message}
      <button type="button" class="close" data-dismiss="alert" aria-label="Close">
        <span aria-hidden="true">&times;</span>
      </button>
    </div>
  </div>`);
  $("#successAlert").delay(_time).fadeOut(0, function () {
    $(this).addClass('fadeOutUp');
    document.getElementById("successAlert").setAttribute("style", "display:true");
    $("#successAlert").delay(300).fadeOut(0, function () {
      $(this).remove();
    });
  });
}

window.cubeSpinner = function (field) {
  $(field).append(`
        <div class="text-center spinnerCube">
            <div class="boxes">
                <div class="box">
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                </div>
                <div class="box">
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                </div>
                <div class="box">
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                </div>
                <div class="box">
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                </div>
            </div>
        </div>
      `);
}

window.outSpinner = function () {
  $(".spinnerCube").addClass("out");
  $(".spinnerCube").delay(2000).fadeIn(0, function () {
    $(".spinnerCube").remove();
  });
}

window.promisify = (inner) =>
  new Promise((resolve, reject) =>
    inner((err, res) => {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    })
  );