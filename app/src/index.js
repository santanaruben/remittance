import 'bootstrap/dist/css/bootstrap.min.css';
import './css/custom.css';
import 'bootstrap/dist/js/bootstrap.min.js';
import './js/validations.js';
const Web3 = require("web3");
const TruffleContract = require("truffle-contract");
const $ = require("jquery");
// Our built contract
const remittanceJson = require("../../build/contracts/Remittance.json");

const App = {
  web3: null,
  account: null,
  Remittance: null,

  initWeb3: function () {
    if (window.ethereum) {
      web3 = new Web3(window.ethereum);
      window.ethereum.enable(); // get permission to access accounts
    } else {
      console.warn(
        "No web3 detected. Falling back to http://127.0.0.1:7545.",
      );
      web3 = new Web3(
        new Web3.providers.HttpProvider("http://127.0.0.1:7545"),
      );
    }
    return this.initContract();
  },

  initContract: async function () {
    try {
      this.Remittance = TruffleContract(remittanceJson);
      this.Remittance.setProvider(web3.givenProvider);

      this.currentAccount();
      this.checkActivity();
      this.updateBalanceContract();
      this.updateLogDeposit();
      this.updateLogWithdraw();
      this.updateLogReclaim();
      this.updateLogClaimFees();
      this.bindEvents();
    } catch (error) {
      console.error("Could not connect to contract or chain.");
    }
  },

  bindEvents: function () {
    $(document).on('click', '#hashIt', App.hashIt);
    $(document).on('click', '#deposit', App.deposit);
    $(document).on('click', '#reclaim', App.reclaim);
    $(document).on('click', '#claimFees', App.claimFees);
    $(document).on('click', '#withdraw', App.withdraw);
    $(document).on('click', '#pauseResume', App.pauseResume);
    $(document).on('click', '#kill', App.kill);
  },

  currentAccount: async function () {
    const accounts = await web3.eth.getAccounts();
    App.account = accounts[0];
    App.checkAdmin();
    document.getElementById("senderAddress").innerHTML = App.account;
    App.updateBalanceSender();
    App.updateBalanceFees();
    window.ethereum.on('accountsChanged', function (accounts) {
      // Update fields
      App.account = accounts[0];
      document.getElementById("senderAddress").innerHTML = App.account;
      App.updateBalanceSender();
      App.updateBalanceFees();
      App.checkAdmin();
    })
  },

  checkAdmin: function () {
    var RemittanceInstance;
    App.Remittance.deployed().then(function (instance) {
      RemittanceInstance = instance;
      return RemittanceInstance.isOwner({from: App.account})
    }).then(function (admin) {
      if (admin) {
        document.getElementById("buttonAdmin").setAttribute("style", "display:true");
      } else {
        document.getElementById("buttonAdmin").setAttribute("style", "display:none");
      }
    }).catch(function (err) {
      console.log(err);
    });
  },

  checkActivity: function () {
    var RemittanceInstance;
    App.Remittance.deployed().then(function (instance) {
      RemittanceInstance = instance;
      return RemittanceInstance.isKilled()
    }).then(function (isKilled) {
      if (isKilled) {
        $("#activity").empty();
        $("#activity").append(`<span class="badge badge-pill badge-danger">contract is dead</span>`);
        $("#adminButtons").empty();
        $("#adminButtons").append(`<button class="dropdown-item btn btn-success" type="button" id="emergencyWithdraw">Withdraw all the funds from the contract</button>
          `);
        document.getElementById('hashIt').disabled = true;
        document.getElementById('deposit').disabled = true;
        document.getElementById('withdraw').disabled = true;
        document.getElementById('reclaim').disabled = true;
        document.getElementById('claimFees').disabled = true;
        document.getElementById('emergencyWithdraw').addEventListener('click', function (event) {
          App.emergencyWithdraw();
        });
      } else {
        return RemittanceInstance.isPaused().then(function (isPaused) {
          if (isPaused == true) {
            $("#activity").empty();
            $("#activity").append(`<span class="badge badge-pill badge-warning">contract in pause</span>`);
            $("#adminButtons").empty();
            $("#adminButtons").append(`<button class="dropdown-item btn btn-success" type="button" id="pauseResume">Activate the contract</button>
          <button class="dropdown-item btn btn-danger" type="button" id="kill">Kill the Contract</button>
          `);
            document.getElementById('hashIt').disabled = true;
            document.getElementById('deposit').disabled = true;
            document.getElementById('withdraw').disabled = true;
            document.getElementById('reclaim').disabled = true;
            document.getElementById('claimFees').disabled = true;
          } else {
            $("#activity").empty();
            $("#activity").append(`<span class="badge badge-pill badge-success">contract active</span>`);
            $("#adminButtons").empty();
            $("#adminButtons").append(`<button class="dropdown-item btn btn-warning" type="button" id="pauseResume">Pause the contract</button>`);
            document.getElementById('hashIt').disabled = false;
            document.getElementById('deposit').disabled = false;
            document.getElementById('withdraw').disabled = false;
            document.getElementById('reclaim').disabled = false;
            document.getElementById('claimFees').disabled = false;
          }
        }).catch(function (err) {
          console.log(err);
        });
      }
    }).catch(function () {});
  },

  pauseResume: async function () {
    $(".spinnerCube").empty();
    $("#txStatusUp").empty();
    cubeSpinner('#txStatusUp');
    var RemittanceInstance;
    App.Remittance.deployed().then(function (instance) {
      RemittanceInstance = instance;
      return RemittanceInstance.isPaused()
    }).then(async function (isPaused) {
      if (isPaused) {
        const success = await RemittanceInstance.resume.call({
          from: App.account
        })
        if (!success) {
          $("#txStatusUp").empty();
          $(".spinnerCube").empty();
          showAlert(txStatusUp, 'The transaction will fail, not sending.', 100);
          throw new Error("The transaction will fail, not sending");
        }
        const txObj = await RemittanceInstance.resume({
            from: App.account
          })
          .on('transactionHash', function (hash) {
            outSpinner();
            showSuccess(txStatusUp, 'Transact on the way ' + hash, 1000);
          })
          .on('receipt', function (receipt) {
            if (!receipt.status) {
              $("#txStatusUp").empty();
              throw new Error("The transaction failed");
            }
            console.log(receipt);
            $("#txStatusUp").empty();
            $(".spinnerCube").empty();
            showSuccess(txStatusUp, "You just reactivated the contract", 100);
            App.checkActivity();
          })
          .on('error', function (err) {
            $("#txStatusUp").empty();
            showAlert(txStatusUp, err, 100);
          });
      } else {
        const success = await RemittanceInstance.pause.call({
          from: App.account
        })
        if (!success) {
          $("#txStatusUp").empty();
          $(".spinnerCube").empty();
          showAlert(txStatusUp, 'The transaction will fail, not sending.', 100);
          throw new Error("The transaction will fail, not sending");
        }
        const txObj = await RemittanceInstance.pause({
            from: App.account
          })
          .on('transactionHash', function (hash) {
            outSpinner();
            showSuccess(txStatusUp, 'Transact on the way ' + hash, 1000);
          })
          .on('receipt', function (receipt) {
            if (!receipt.status) {
              $("#txStatusUp").empty();
              throw new Error("The transaction failed");
            }
            console.log(receipt);
            $("#txStatusUp").empty();
            $(".spinnerCube").empty();
            showSuccess(txStatusUp, "You just paused the contract", 100);
            App.checkActivity();
          })
          .on('error', function (err) {
            $("#txStatusUp").empty();
            showAlert(txStatusUp, err, 100);
          });
      }

    }).catch(function (err) {
      $(".spinnerCube").empty();
      console.log(err.message);
      showAlert(txStatusUp, 'Transaction rejected: ' + err.message);
    });
  },

  kill: async function () {
    $(".spinnerCube").empty();
    $("#txStatusUp").empty();
    cubeSpinner('#txStatusUp');
    const RemittanceInstance = await App.Remittance.deployed();
    const success = await RemittanceInstance.kill.call({
      from: App.account
    })
    if (!success) {
      $("#txStatusUp").empty();
      $(".spinnerCube").empty();
      showAlert(txStatusUp, 'The transaction will fail, not sending.', 100);
      throw new Error("The transaction will fail, not sending");
    }
    const txObj = await RemittanceInstance.kill({
        from: App.account
      })
      .on('transactionHash', function (hash) {
        outSpinner();
        showSuccess(txStatusUp, 'Transact on the way ' + hash, 1000);
      })
      .on('receipt', function (receipt) {
        if (!receipt.status) {
          $("#txStatusUp").empty();
          throw new Error("The transaction failed");
        }
        console.log(receipt);
        $("#txStatusUp").empty();
        $(".spinnerCube").empty();
        showSuccess(txStatusUp, "You just killed the contract", 100);
        App.checkActivity();
      })
      .on('error', function (err) {
        $("#txStatusUp").empty();
        showAlert(txStatusUp, err, 100);
      });
  },

  emergencyWithdraw: async function () {
    $(".spinnerCube").empty();
    $("#txStatusUp").empty();
    cubeSpinner('#txStatusUp');
    const RemittanceInstance = await App.Remittance.deployed();
    const success = await RemittanceInstance.emergencyWithdraw.call({
      from: App.account
    })
    if (!success) {
      $("#txStatusUp").empty();
      $(".spinnerCube").empty();
      showAlert(txStatusUp, 'The transaction will fail, not sending.', 100);
      throw new Error("The transaction will fail, not sending");
    }
    const txObj = await RemittanceInstance.emergencyWithdraw({
        from: App.account
      })
      .on('transactionHash', function (hash) {
        outSpinner();
        showSuccess(txStatusUp, 'Transact on the way ' + hash, 1000);
      })
      .on('receipt', function (receipt) {
        if (!receipt.status) {
          $("#txStatusUp").empty();
          throw new Error("The transaction failed");
        }
        console.log(receipt);
        $("#txStatusUp").empty();
        $(".spinnerCube").empty();
        showSuccess(txStatusUp, "You just withdrew all the funds from the contract", 100);
        App.updateBalanceContract();
        App.updateBalanceSender();
      })
      .on('error', function (err) {
        $("#txStatusUp").empty();
        showAlert(txStatusUp, err, 100);
      });
  },

  deposit: async function () {
    $(".spinnerCube").empty();
    $("#txStatusUp").empty();
    cubeSpinner('#txStatusUp');
    const hashDeposit = $('#hashDeposit').val();
    const amount = $('#amount').val();
    const receiverDeposit = $('#receiverDeposit').val();
    const blockDays = $('#blockDays').val();
    const blockDaysLimit = blockDays * (86400 / 15);
    const RemittanceInstance = await App.Remittance.deployed();
    const success = await RemittanceInstance.deposit.call(hashDeposit, receiverDeposit, blockDaysLimit, {
      value: amount,
      from: App.account
    })
    if (!success) {
      $("#txStatusUp").empty();
      $(".spinnerCube").empty();
      showAlert(txStatusUp, 'The transaction will fail, not sending.', 100);
      throw new Error("The transaction will fail, not sending");
    }
    const txObj = await RemittanceInstance.deposit(hashDeposit, receiverDeposit, blockDaysLimit, {
        value: amount,
        from: App.account
      })
      .on('transactionHash', function (hash) {
        outSpinner();
        showSuccess(txStatusUp, 'Transact on the way ' + hash, 1000);
      })
      .on('receipt', function (receipt) {
        if (!receipt.status) {
          $("#txStatusUp").empty();
          throw new Error("The transaction failed");
        }
        console.log(receipt);
        $("#txStatusUp").empty();
        $(".spinnerCube").empty();
        showSuccess(txStatusUp, "You have deposited " + App.weiToEth(amount) + " to the address " + receiverDeposit + " and you can reclaim them in " + blockDaysLimit + " days.", 1000);
        App.updateBalanceContract();
        App.updateBalanceSender();
        App.updateBalanceFees();
      })
      .on('error', function (err) {
        $("#txStatusUp").empty();
        showAlert(txStatusUp, err, 100);
      });
  },

  withdraw: function () {
    const passwordWithdraw = App.bytes32($("#passwordWithdraw").val());
    let RemittanceInstance;
    return App.Remittance.deployed()
      .then(instance => {
        RemittanceInstance = instance;
        // Simulate the real call
        return RemittanceInstance.withdraw.call(passwordWithdraw, {
          from: App.account
        });
      })
      .then(success => {
        if (!success) {
          $("#txStatusUp").empty();
          $(".spinnerCube").empty();
          showAlert(txStatusUp, 'The transaction will fail, not sending.', 100);
          throw new Error("The transaction will fail anyway, not sending");
        }
        return RemittanceInstance.withdraw(passwordWithdraw, {
            from: App.account
          })
          .on('transactionHash', function (hash) {
            outSpinner();
            showSuccess(txStatusUp, 'Transact on the way ' + hash, 1000);
          })
          .on('receipt', function (receipt) {
            if (!receipt.status) {
              $("#txStatusUp").empty();
              throw new Error("The transaction failed");
            }
            console.log(receipt);
            $("#txStatusUp").empty();
            $(".spinnerCube").empty();
            showSuccess(txStatusUp, "Withdrawal has been satisfactory.", 1000);
            App.updateBalanceContract();
            App.updateBalanceSender();
          })
          .on('error', function (err) {
            $("#txStatusUp").empty();
            showAlert(txStatusUp, err, 100);
          });
      })
      .then(txObj => {
        const log = txObj.logs[0].args;
        showSuccess(txStatusUp, "Amount: " + App.weiToEth(log.amount), 1000);
      })
      .catch(e => {
        $("#txStatusUp").empty();
        showAlert(txStatusUp, e, 100);
        console.error(e);
      });
  },

  reclaim: function () {
    const hashReclaim = $("#hashReclaim").val();
    let RemittanceInstance;
    return App.Remittance.deployed()
      .then(instance => {
        RemittanceInstance = instance;
        // Simulate the real call
        return RemittanceInstance.reclaim.call(hashReclaim, {
          from: App.account
        });
      })
      .then(success => {
        if (!success) {
          $("#txStatusUp").empty();
          $(".spinnerCube").empty();
          showAlert(txStatusUp, 'The transaction will fail, not sending.', 100);
          throw new Error("The transaction will fail anyway, not sending");
        }
        return RemittanceInstance.reclaim(hashReclaim, {
            from: App.account
          })
          .on('transactionHash', function (hash) {
            outSpinner();
            showSuccess(txStatusUp, 'Transact on the way ' + hash, 1000);
          })
          .on('receipt', function (receipt) {
            if (!receipt.status) {
              $("#txStatusUp").empty();
              throw new Error("The transaction failed");
            }
            console.log(receipt);
            $("#txStatusUp").empty();
            $(".spinnerCube").empty();
            showSuccess(txStatusUp, "Reclaim has been satisfactory.", 1000);
            App.updateBalanceContract();
            App.updateBalanceSender();
          })
          .on('error', function (err) {
            $("#txStatusUp").empty();
            showAlert(txStatusUp, err, 100);
          });
      })
      .then(txObj => {
        const log = txObj.logs[0].args;
        showSuccess(txStatusUp, "Amount: " + App.weiToEth(log.amount), 1000);
      })
      .catch(e => {
        $("#txStatusUp").empty();
        showAlert(txStatusUp, e, 100);
        console.error(e);
      });
  },

  claimFees: function () {
    let RemittanceInstance;
    return App.Remittance.deployed()
      .then(instance => {
        RemittanceInstance = instance;
        // Simulate the real call
        return RemittanceInstance.claimFees.call({
          from: App.account
        });
      })
      .then(success => {
        if (!success) {
          $("#txStatusUp").empty();
          $(".spinnerCube").empty();
          showAlert(txStatusUp, 'The transaction will fail, not sending.', 100);
          throw new Error("The transaction will fail anyway, not sending");
        }
        return RemittanceInstance.claimFees({
            from: App.account
          })
          .on('transactionHash', function (hash) {
            outSpinner();
            showSuccess(txStatusUp, 'Transact on the way ' + hash, 1000);
          })
          .on('receipt', function (receipt) {
            if (!receipt.status) {
              $("#txStatusUp").empty();
              throw new Error("The transaction failed");
            }
            console.log(receipt);
            $("#txStatusUp").empty();
            $(".spinnerCube").empty();
            showSuccess(txStatusUp, "Claim Fees has been satisfactory.", 1000);
            App.updateBalanceContract();
            App.updateBalanceSender();
            App.updateBalanceFees();
          })
          .on('error', function (err) {
            $("#txStatusUp").empty();
            showAlert(txStatusUp, err, 100);
          });
      })
      .then(txObj => {
        const log = txObj.logs[0].args;
        showSuccess(txStatusUp, "Amount: " + App.weiToEth(log.amount), 1000);
      })
      .catch(e => {
        $("#txStatusUp").empty();
        showAlert(txStatusUp, e, 100);
        console.error(e);
      });
  },

  updateBalanceContract: function () {
    var RemittanceInstance;
    App.Remittance.deployed().then(function (instance) {
      RemittanceInstance = instance;
      var contractAddress = RemittanceInstance.address;
      web3.eth.getBalance(contractAddress, function (err, result) {
        document.getElementById("amountContract").innerHTML = "Contract Balance " + web3.utils.fromWei(result, "ether") + " ETH";
      })
    }).catch(function (err) {
      console.log(err.message);
    });
  },

  updateBalanceSender: async function () {
    var result = await App.getBalance(App.account);
    document.getElementById("senderBalance").innerHTML = result + " WEI";
    document.getElementById("senderBalanceEth").innerHTML = App.weiToEth(result);
  },

  updateBalanceFees: function () {
    var RemittanceInstance;
    App.Remittance.deployed().then(async function (instance) {
      RemittanceInstance = instance;
      const amount = await RemittanceInstance.feeBalance(App.account);
      document.getElementById("fees").innerHTML = amount;
      document.getElementById("feesEth").innerHTML = App.weiToEth(amount);
    }).catch(function (err) {
      console.log(err.message);
    });
  },

  getBalance: async function (address) {
    const balance = promisify(cb => web3.eth.getBalance(address, cb))
    try {
      return balance
    } catch (error) {
      showAlert(txStatusUp, 'Transaction rejected: ' + error);
    }
  },

  weiToEth: function (amount) {
    return web3.utils.fromWei(amount, "ether") + " ETH";
  },

  bytes32: function (value) {
    return web3.utils.fromAscii(value);
  },

  hashIt: async function () {
    $("#txStatusUp").empty();
    cubeSpinner('#txStatusUp');
    const password = App.bytes32($('#password').val());
    const receiverAddress = $("input[id='receiverAddress']").val();
    let RemittanceInstance = await App.Remittance.deployed();
    const hash = await RemittanceInstance.hashIt(password, receiverAddress, {
      from: App.account
    });
    $("#txStatusUp").empty();
    showSuccess(txStatusUp, 'Created Hash: ' + hash, 1000);
  },

  updateLogDeposit: async function () {
    $("#txStatusUp").empty();
    $("#logDeposit").empty();
    var cont = 1;
    $("#logDeposit").append(`
      <table style=" width:100%; font-size: 11px;" id="tableLogDeposit" class="scene_element scene_element--fadeindown table bordered table-light table-hover table-striped table-bordered rounded">
        <tr>
          <th class="text-center">#</th>
          <th class="text-center">Tx Hash</th>
          <th class="text-center">Amount</th>
          <th class="text-center">Sender</th>
          <th class="text-center">Receiver</th>
          <th class="text-center">BlockLimit</th>
        </tr>
        <div id="tbody"></div>
      </table>
    `);
    var RemittanceInstance = await App.Remittance.deployed();
    RemittanceInstance.LogDeposited({
      fromBlock: 0
    }, function (error, event) {
      var datosEvento = event.args;
      var hash = datosEvento.hash;
      var amount = datosEvento.amount;
      var amountEth = web3.utils.fromWei(amount, "ether") + " ETH";
      var sender = datosEvento.sender;
      var receiver = datosEvento.receiver;
      var blockLimit = datosEvento.blockLimit;
      $("#tableLogDeposit tbody").after(`           
        <tr class="table table-light table-hover table-striped table-bordered rounded">
          <td class="p-1 text-center tdLogs">${cont}</td>
          <td class="p-1 text-center tdLogs">${hash}</td>
          <td class="p-1 text-center tdLogs" title="${amount} WEI">${amountEth}</td>
          <td class="p-1 text-center tdLogs">${sender}</td>
          <td class="p-1 text-center tdLogs">${receiver}</td>
          <td class="p-1 text-center tdLogs">${blockLimit}</td>
        </tr>               
      `);
      cont++;
    })
  },

  updateLogWithdraw: async function () {
    $("#txStatusUp").empty();
    $("#logWithdraw").empty();
    var cont = 1;
    $("#logWithdraw").append(`
      <table style=" width:100%; font-size: 11px;" id="tableLogWithdraw" class="scene_element scene_element--fadeindown table bordered table-light table-hover table-striped table-bordered rounded">
        <tr>
          <th class="text-center">#</th>
          <th class="text-center">Tx Hash</th>
          <th class="text-center">Amount</th>
          <th class="text-center">Receiver</th>
        </tr>
        <div id="tbody"></div>
      </table>
    `);
    var RemittanceInstance = await App.Remittance.deployed();
    RemittanceInstance.LogWithdrawn({
      fromBlock: 0
    }, function (error, event) {
      var datosEvento = event.args;
      var hash = datosEvento.hash;
      var amount = datosEvento.amount;
      var amountEth = web3.utils.fromWei(amount, "ether") + " ETH";
      var receiver = datosEvento.account;
      $("#tableLogWithdraw tbody").after(`           
        <tr class="table table-light table-hover table-striped table-bordered rounded">
          <td class="p-1 text-center tdLogs">${cont}</td>
          <td class="p-1 text-center tdLogs">${hash}</td>
          <td class="p-1 text-center tdLogs" title="${amount} WEI">${amountEth}</td>
          <td class="p-1 text-center tdLogs">${receiver}</td>
        </tr>               
      `);
      cont++;
    })
  },

  updateLogReclaim: async function () {
    $("#txStatusUp").empty();
    $("#logReclaim").empty();
    var cont = 1;
    $("#logReclaim").append(`
      <table style=" width:100%; font-size: 11px;" id="tableLogReclaim" class="scene_element scene_element--fadeindown table bordered table-light table-hover table-striped table-bordered rounded">
        <tr>
          <th class="text-center">#</th>
          <th class="text-center">Tx Hash</th>
          <th class="text-center">Amount</th>
          <th class="text-center">Receiver</th>
        </tr>
        <div id="tbody"></div>
      </table>
    `);
    var RemittanceInstance = await App.Remittance.deployed();
    RemittanceInstance.LogReclaimed({
      fromBlock: 0
    }, function (error, event) {
      var datosEvento = event.args;
      var hash = datosEvento.hash;
      var amount = datosEvento.amount;
      var amountEth = web3.utils.fromWei(amount, "ether") + " ETH";
      var receiver = datosEvento.account;
      $("#tableLogReclaim tbody").after(`           
        <tr class="table table-light table-hover table-striped table-bordered rounded">
          <td class="p-1 text-center tdLogs">${cont}</td>
          <td class="p-1 text-center tdLogs">${hash}</td>
          <td class="p-1 text-center tdLogs" title="${amount} WEI">${amountEth}</td>
          <td class="p-1 text-center tdLogs">${receiver}</td>
        </tr>               
      `);
      cont++;
    })
  },

  updateLogClaimFees: async function () {
    $("#txStatusUp").empty();
    $("#logClaimFees").empty();
    var cont = 1;
    $("#logClaimFees").append(`
      <table style=" width:100%; font-size: 11px;" id="tableLogClaimFees" class="scene_element scene_element--fadeindown table bordered table-light table-hover table-striped table-bordered rounded">
        <tr>
          <th class="text-center">#</th>
          <th class="text-center">Amount</th>
          <th class="text-center">Receiver</th>
        </tr>
        <div id="tbody"></div>
      </table>
    `);
    var RemittanceInstance = await App.Remittance.deployed();
    RemittanceInstance.LogFeesClaimed({
      fromBlock: 0
    }, function (error, event) {
      var datosEvento = event.args;
      var amount = datosEvento.amount;
      var amountEth = web3.utils.fromWei(amount, "ether") + " ETH";
      var receiver = datosEvento.account;
      $("#tableLogClaimFees tbody").after(`           
        <tr class="table table-light table-hover table-striped table-bordered rounded">
          <td class="p-1 text-center tdLogs">${cont}</td>
          <td class="p-1 text-center tdLogs" title="${amount} WEI">${amountEth}</td>
          <td class="p-1 text-center tdLogs">${receiver}</td>
        </tr>               
      `);
      cont++;
    })
  },

};

$("#amount").keyup(function () {
  document.getElementById('amountEth').innerHTML = App.weiToEth($('#amount').val());
  validateBigAmount('amount');
});

$("#receiverAddress").keyup(function () {
  App.updateBalanceReceiver();
});

$("#receiverAddress").on('change', function () {
  App.updateBalanceReceiver();
});

$(function () {
  $(window).on('load', function () {
    App.initWeb3();
  });
});