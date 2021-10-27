import Web3 from "web3";
import { newKitFromWeb3 } from "@celo/contractkit";
import BigNumber from "bignumber.js";
import crowdfundAbi from "../contract/abis/crownzy.abi.json";
import erc20Abi from "../contract/abis/erc20.abi.json";

const ERC20_DECIMALS = 18;
const CrownZyContractAddress = "0x018d92A7B531370eb7c63960F103F638EAd0CF6e";
const cUSDContractAddress = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1"; 

let kit;
let contract;
let projects = [];
let projectContributions = null;

const connectCeloWallet = async function () {
  if (window.celo) {
    try {
      notification("Hãy chấp thuận Dapp để sử dụng");
      await window.celo.enable();
      notificationOff();

      const web3 = new Web3(window.celo);
      kit = newKitFromWeb3(web3);

      const accounts = await kit.web3.eth.getAccounts();
      kit.defaultAccount = accounts[0];
      //document.querySelector("#balance").textContent = accounts[0];  // get asdress wallet
      contract = new kit.web3.eth.Contract(crowdfundAbi, CrownZyContractAddress);
    } catch (error) {
      notification(`⚠️ ${error}.`);
    }
  } else {
    notification("Hãy cài đặt Celo Extension Wallet.");
  }
};

async function approve(_price) {
  const cUSDContract = new kit.web3.eth.Contract(erc20Abi, cUSDContractAddress);

  const result = await cUSDContract.methods
    .approve(CrownZyContractAddress, _price)
    .send({ from: kit.defaultAccount });
  
  return result;
}

// Lấy số dư ví
const getBalance = async function () {
  const totalBalance = await kit.getTotalBalance(kit.defaultAccount);
  const cUSDBalance = totalBalance.cUSD.shiftedBy(-ERC20_DECIMALS).toFixed(2);
  const accounts = await kit.web3.eth.getAccounts();
  document.querySelector("#balance").textContent = accounts[0];
};


const getProjects = async function () {
  const _projectsLength = await contract.methods.getProjectCount().call();
  const _projects = [];

  for (let i = 0; i < _projectsLength; i++) {
    let _project = new Promise(async (resolve, reject) => {
      let p = await contract.methods.getProject(i).call();
      resolve({
        index: i,
        owner: p[0],
        name: p[1],
        image: p[2],
        description: p[3],
        website: p[4],
        target: new BigNumber(p[5]),
        minContrib: new BigNumber(p[6]),
        totalFunded: new BigNumber(p[7]),
        fundingToTarget: new BigNumber(p[5] - p[7]),
        fundersCount: p[8],
        timestamp: p[9],
        funded: p[10],
        fundingOpen: p[11],
      });
    });
    _projects.push(_project);
  }
  projects = await Promise.all(_projects);
  renderProjects();
};

function renderProjects() {
  document.getElementById("catalogue").innerHTML = "";
  document.getElementById("catalogue-close").innerHTML = "";
  projects.forEach((_project) => {
    if(_project.fundingOpen == true){
    const newDiv = document.createElement("div");
    newDiv.className = "col-md-4";
    newDiv.innerHTML = projectTemplate(_project);
    document.getElementById("catalogue").appendChild(newDiv);
    }
    else{
      const newDiv = document.createElement("div");
    newDiv.className = "col-md-4";
    newDiv.innerHTML = projectTemplate(_project);
    document.getElementById("catalogue-close").appendChild(newDiv);
    }
  });
}

function identiconTemplate(_address, shape) {
  const icon = blockies
    .create({
      seed: _address,
      size: 8,
      scale: 16,
    })
    .toDataURL();

  return `
  <div class="${shape} overflow-hidden d-inline-block border border-white border-2 shadow-sm m-0">
    <a href="https://alfajores-blockscout.celo-testnet.org/address/${_address}/transactions"
        target="_blank">
        <img src="${icon}" width="48" alt="${_address}">
    </a>
  </div>
  `;
}

// Tạo thẻ 
function projectTemplate(_project) {
  return `
    <div class="card mb-4" style="max-height:440px;box-shadow: rgb(4 17 29 / 25%) 0px 0px 24px 0px;">
    
      <img class="card-img-top" src="${_project.image}" alt="..." style="height:12vw;">
      <div class="position-absolute top-0 end-0 mt-4 px-2 py-1 rounded-start" style="background:#2081e2;color:#fff">
        ${_project.fundersCount == 1 ? `${_project.fundersCount} Đóng góp` : `${_project.fundersCount} Đóng góp`}
        <p class="card-text">
          <i class="bi bi-globe"></i>
          <span><a style="color:#fff"href=${
            _project.website
          } target="_blank" rel="noopener noreferrer">Website</a></span>
        </p>
        </div>
      <div class="card-body text-left p-4 position-relative">
      <div class="translate-middle-y position-absolute top-0">
        ${identiconTemplate(_project.owner, "rounded-circle")}
      </div>
      <h2 class="card-title fs-4 fw-bold mt-2">${_project.name}</h2>
      <p class="card-text"
      style="height: 75px;
      text-overflow: ellipsis;
      overflow: hidden;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      display: -webkit-box;
      margin-bottom:16px;">
        ${_project.description}         
      </p>
      
      <div class="d-grid gap-2">
        <a id="${_project.index}" class="viewDetails"
        style="border: 2px solid #2081e2;
        border-radius: 12px;
        margin:auto;
        color: #2081e2;
        padding: 12px 47px;
        cursor: pointer;
        font-size: 16px;
        font-weight: 800;
        box-shadow: rgb(4 17 29 / 25%) 0px 0px 14px 0px;
        "
        >
          Chi tiết dự án
        </a>
      </div>
    </div>
  </div>
`;
}

const getProjectContributions = async function(index) {
  let contrib = new Promise(async (resolve, reject) => {
    let c = await contract.methods.getContributions(index).call();
    resolve({
      contribs: c[0],
      timestamps: c[1],
      contribsSum: new BigNumber(c[2]),
      withdrawable: c[3]
    });
  });

  await contrib.then(result => projectContributions = result).catch(err => notification(`${err}`));
}


function renderProjectDetails(index) {
  document.getElementById("mainContainer").style.display = "none";
  document.getElementById("subContainer").innerHTML = "";
  document.getElementById("subContainer").style.display = "block";
  
  // Get a specific project id and render it
  document.title = projects[index].name;
  document.body.scrollTop = 0;  // Scroll to Top - For Safari
  document.documentElement.scrollTop = 0;   // Scroll to Top - For Chrome, Firefox, IE & Opera
  const newDiv = document.createElement("div");
  newDiv.className = "detail-body";
  newDiv.innerHTML = projectDetailsTemplate(projects[index]);
  document.getElementById("subContainer").appendChild(newDiv);
}

function projectDetailsTemplate(_project) {
  let projectDate = new Date(_project.timestamp * 1000).toUTCString();

  return `
    <a class="closeDetails" title="Go Back" href="/"
    style="
    border-radius: 12px;
    margin:auto;
    color: #fff;
    background: #2081e2;
    padding: 12px 47px;
    cursor: pointer;
    font-size: 16px;
    font-weight: 800;
    box-shadow: rgb(4 17 29 / 25%) 0px 0px 14px 0px;
    "
    >
      <i class="bi bi-chevron-double-left closeDetails"></i>
    </a>
    </br>
    </br>
    <div class="row"
    style="border: 2px solid #2081e2;
    border-radius: 12px;
    box-shadow: rgb(4 17 29 / 25%) 0px 0px 14px 0px;
    margin-bottom:2rem;
    padding:1.5rem;
    ">
      <div class="col-md-4" style="width: 53.333333%;">
        <img class="img-fluid" src="${_project.image}" alt="...">
        <p>
          <h3>${_project.name}</h3>
          <span><b>Thời gian đăng</b>: ${projectDate}</span>
        </p>
        <p class="mt-4">
          <i class="bi bi-globe"></i>
          <span><a href=${
            _project.website
          } target="_blank" rel="noopener noreferrer">Website dự án</a></span>
        </p>
        <div class="row" style="min-height: 150px">
        <div class="col-md-8">
          ${_project.description}
        </div>
      </div>
        ${_project.owner == kit.defaultAccount && _project.fundingOpen ? 
        `<a class="btn btn-lg btn-outline-danger fs-6 p-3" data-bs-toggle="modal" data-bs-target="#project${_project.index}">
          Đóng dự án
        </a>
        <div class="modal fade" id="project${_project.index}" tabindex="-1" aria-labelledby="closeFundModalLabel" aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="closeFundModalLabel">⚠️ Close Fund</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <b>Bạn có chắc muốn đóng dự án không?</b>
              <br/>
              <br/>
              Nếu bạn đóng dự án trước khi đạt được mục tiêu, bạn sẽ không thể mở lại dự án hoặc rút bất kỳ khoản tiền nào. Các nhà đầu tư sẽ có thể yêu cầu hoàn lại tiền!
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-light border" data-bs-dismiss="modal">
                Cancel
              </button>
              <button type="button" class="btn btn-danger closeFundBtn" data-bs-dismiss="modal" id=${_project.index}>
                Đóng quỹ
              </button>
            </div>
          </div>
        </div>
      </div>
      <br/>
      <br/>`
      : ``
      }
      ${_project.owner == kit.defaultAccount && _project.funded && !_project.fundingOpen && _project.totalFunded > 0 ? 
        `<a class="btn btn-lg btn-outline-primary withdrawFunds fs-6 p-3" id=${_project.index}>Withdraw Funds</a><br/>
        <br/>` : ``
      }
      </div>
      <div class="col-md-8" style="width: 46.666667%;">
  
        <div class="row">
          <div class="col-md-12">
            <b>Mục tiêu:</b> ${_project.target.shiftedBy(-ERC20_DECIMALS).toFixed(2)} cUSD
          
          </div>
          <div class="col-md-6" hidden=${!_project.fundingOpen}>
            <b>Minimum Contribution:</b> ${_project.minContrib.shiftedBy(-ERC20_DECIMALS).toFixed(2)} cUSD
          </div>
          <div class="col-md-6">
            <b>Số người đã tài trợ:</b> ${_project.fundersCount}
          </div>
        </div>
        <hr style="border-top: 1px solid">
        <div class="row">
          <div class="col-md-12">
            <b>Số tiền đã huy động:</b> ${_project.totalFunded.shiftedBy(-ERC20_DECIMALS).toFixed(2)} cUSD
          </div>
          <div class="col-md-6">
            <b>Trạng thái dự án</b> ${_project.fundingOpen ? "Đang mở" : "Đã đóng"}
          </div>
          <div class="col-md-6">
            <b>Tiến trình: </b> ${(_project.totalFunded.shiftedBy(-ERC20_DECIMALS) / _project.target.shiftedBy(-ERC20_DECIMALS)) * 100}<b>%</b>
          </div>
        </div>
        ${_project.fundingOpen && _project.funded == false ? 
          `
          <div class="row">
            <div class="col-md-12" style="margin-bottom:2rem">
              <label for="fundRange">Mức tiền tài trợ: <b id="rangeVal">${_project.minContrib.shiftedBy(-ERC20_DECIMALS).toFixed(2)}</b> cUSD</label>
              <input type="range" class="form-range fundingRange" min="${_project.minContrib.shiftedBy(-ERC20_DECIMALS).toFixed(2)}" step="${_project.minContrib.shiftedBy(-ERC20_DECIMALS).toFixed(2)}" max="${_project.fundingToTarget.shiftedBy(-ERC20_DECIMALS).toFixed(2)}" value="${_project.minContrib.shiftedBy(-ERC20_DECIMALS).toFixed(2)}" id="fundRange">

              </br>
              <textarea rows="5" spellcheck="false" style="
              width: 100%;
              margin-bottom: 2rem;
          ">  </textarea>
              </br>
              <a class="fundBtn" id=${_project.index}
        style="border: 2px solid #2081e2;
        border-radius: 12px;
        margin:auto;
        padding: 12px 47px;
        color: #2081e2;
        cursor: pointer;
        font-size: 16px;
        font-weight: 800;
        box-shadow: rgb(4 17 29 / 25%) 0px 0px 14px 0px;
              ">
                Tài trợ
              </a>
            </div>
          </div>`
        : 
          ``
        }
        ${projectContributions != null && projectContributions.contribs.length > 0 ? 
          `
          <a id="${_project.index}" class="viewContributionDetails"
          style="
        border: 2px solid #2081e2;
        border-radius: 12px;
        margin:auto;
        padding: 12px 47px;
        color: #2081e2;
        cursor: pointer;
        font-size: 16px;
        font-weight: 800;
        box-shadow: rgb(4 17 29 / 25%) 0px 0px 14px 0px;
          ">
            Chi tiết số tiền đóng góp
          </a>
          <div id="contribSection" hidden>
            <b>Tổng đóng góp: </b> ${projectContributions.contribsSum.shiftedBy(-ERC20_DECIMALS).toFixed(2)} cUSD
            <details open>
              <summary>Lịch sử đóng góp</summary>
              <p id="contribDetails"></p>
            </details>
            ${_project.fundingOpen == false && _project.funded == false && projectContributions.contribs.length > 0 ? 
              `<hr style="border-top: 1px solid">
              <div class="row">
                <div class="col-md-6">
                  <button class="btn btn-lg btn-outline-dark requestRefund fs-6 p-3" id=${_project.index}>
                    Request refund
                  </button>
                </div>
                <div class="col-md-6">
                  <button class="btn btn-lg btn-outline-dark processRefund fs-6 p-3" id=${_project.index} disabled>
                    Process Refund
                  </button>
                </div>
              </div>` 
            :
              ``}
          </div>` 
        : 
          ``
        }
        </br>
        </br>
        </br>
      </div>
    </div>
  `;
}
function notification(_text) {
  document.querySelector(".alert").style.display = "block";
  document.querySelector("#notification").textContent = _text;
}

function notificationOff() {
  document.querySelector(".alert").style.display = "none";
}

window.addEventListener("load", async () => {
  notification("Đang tải");
  await connectCeloWallet();
  await getBalance();
  await getProjects();
  notificationOff();
});

document
  .querySelector("#newProjectBtn")
  .addEventListener("click", async (e) => {
    const params = [
      document.getElementById("newProjectName").value,
      document.getElementById("newImgUrl").value,
      document.getElementById("newProjectDescription").value,
      document.getElementById("newWebsite").value,
      new BigNumber(document.getElementById("newTarget").value)
        .shiftedBy(ERC20_DECIMALS)
        .toString(),
      new BigNumber(document.getElementById("newMinContrib").value)
        .shiftedBy(ERC20_DECIMALS)
        .toString(),
    ];
    notification(`thêm "${params[0]}"...`);
    try {
      const result = await contract.methods
        .createProject(...params)
        .send({ from: kit.defaultAccount })
      notification(`Bạn đã thêm thành công "${params[0]}".`);
    } catch (error) {
      notification(`⚠️ ${error}.`);
    }
    getProjects();
  });

document.querySelector("#catalogue").addEventListener("click", async (e) => {
  if(e.target.className.includes("viewDetails")) {
    await getProjectContributions(parseInt(e.target.id));
    renderProjectDetails(parseInt(e.target.id));
  }
});

document.querySelector("#subContainer").addEventListener("click", async (e) => {
  function closeProjectDetails() {
    document.title = "Crowdfund";
    document.getElementById("mainContainer").style.display = "block";
    document.getElementById("subContainer").style.display = "none";

    getProjects();
    getBalance();
  };

  if(e.target.className.includes("closeDetails")) {
    closeProjectDetails();
  }

  if(document.querySelector(".fundingRange")) {
    document.querySelector(".fundingRange").oninput = function (e) {
      document.getElementById("rangeVal").innerHTML = e.target.value;
    }
  }

  if (e.target.className.includes("fundBtn")) {
    const index = e.target.id;
    const price = new BigNumber(document.getElementById("rangeVal").innerHTML)
      .shiftedBy(ERC20_DECIMALS)
      .toString();
    
    notification("Đang phê duyệt thanh toán...");
    
    try {
      await approve(price);
    } catch (error) {
      notification(`⚠️ ${error}.`);
    }
    
    notification(`Đang thanh toán cho "${projects[index].name}"...`);
    
    try {
      const result = await contract.methods
        .fundProject(index, price)
        .send({ from: kit.defaultAccount });
      notification(`Bạn đã đầu tư thành công "${projects[index].name}".`);
      // Go back to main projects zone
      closeProjectDetails();
    } catch (error) {
      notification(`⚠️ ${error}.`);
    }
  }

  if(e.target.className.includes("closeFundBtn")) {
    const index = e.target.id;

    notification(`Đóng "${projects[index].name}"...`);

    try {
      const result = await contract.methods
        .closeFund(index)
        .send({ from: kit.defaultAccount })
      notification(`Bạn đóng lại dự án thành công"${projects[index].name}".`);
      closeProjectDetails();
    } catch (error) {
      notification(`⚠️ ${error}.`);
    }
  }

  if(e.target.className.includes("withdrawFunds")) {
    const index = e.target.id;

    notification(`⌛ Rút vốn từ "${projects[index].name}"...`);

    try {
      const result = await contract.methods
        .withdrawFunds(index)
        .send({ from: kit.defaultAccount })
      notification(`Bạn đã rút tiền thành công từ "${projects[index].name}".`);
      closeProjectDetails();
    } catch (error) {
      notification(`⚠️ ${error}.`);
    }
  }

  if(e.target.className.includes("requestRefund")) {
    const index = e.target.id;

    notification(`⌛ Yêu cầu hoàn lại từ "${projects[index].name}"...`);

    try {
      const result = await contract.methods
        .requestRefund(index)
        .send({ from: kit.defaultAccount })
      notification(`Yêu cầu của bạn cho việc hoàn tiền "${projects[index].name}" has been processed.`);
      closeProjectDetails();
    } catch (error) {
      notification(`⚠️ ${error}.`);
    }
  }

  if(e.target.className.includes("processRefund")) {
    const index = e.target.id;

    notification(`Xử lý hoàn tiền từ "${projects[index].name}"...`);

    try {
      const result = await contract.methods
        .getRefund(index)
        .send({ from: kit.defaultAccount })
      notification(`Bạn được hoàn tiền thành công bởi: "${projects[index].name}".`);
      closeProjectDetails();
    } catch (error) {
      notification(`⚠️ ${error}.`);
    }
  }

  if(e.target.className.includes("viewContributionDetails")) {
    if(projectContributions.withdrawable && projectContributions.contribs.length > 0) {
      document.querySelector(".requestRefund").setAttribute("disabled", "disabled");
      document.querySelector(".processRefund").removeAttribute("disabled");
    }
    
    document.getElementById("contribSection").removeAttribute("hidden");
    document.querySelector(".viewContributionDetails").setAttribute("hidden", "hidden");
    
    const contribsList = document.createElement("ul");
    for(let i=0; i < projectContributions.contribs.length; i++){
      const newListItem = document.createElement("li");
      newListItem.innerHTML = `<b>${new BigNumber(projectContributions.contribs[i]).shiftedBy(-ERC20_DECIMALS).toFixed(2)} cUSD</b> - 
        ${new Date(projectContributions.timestamps[i] * 1000).toUTCString()}`;
      contribsList.appendChild(newListItem)
    }
    document.getElementById("contribDetails").appendChild(contribsList);
  }
});