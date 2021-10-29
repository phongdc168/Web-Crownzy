import Web3 from "web3";
import { newKitFromWeb3 } from "@celo/contractkit";
import BigNumber from "bignumber.js";
import crowdfundAbi from "../contract/abis/crownzy.abi.json";
import erc20Abi from "../contract/abis/erc20.abi.json";

const ERC20_DECIMALS = 18;
const CrownZyContractAddress = "0x207E9578361fae09d011a1a2c053D26a1D47db11";
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

const get_acc = async function(){
  const accounts = await kit.web3.eth.getAccounts();
  return accounts[0];
}

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
  // <img class="card-img-top" src="${_project.image}" alt="..." style="height:12vw;">
  return `
    <div class="card mb-4" style="max-height:440px;box-shadow: rgb(4 17 29 / 25%) 0px 0px 24px 0px;">
      <div class="image-thumb" style="background-image: url('${_project.image}'); "></div>
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
      <h2 class="card-title fs-4 fw-bold mt-2" style="text-overflow: ellipsis; overflow: hidden; -webkit-line-clamp: 2; -webkit-box-orient: vertical; display: -webkit-box;">${_project.name}</h2>
      <p class="card-text" style="height: 75px; text-overflow: ellipsis; overflow: hidden; -webkit-line-clamp: 3; -webkit-box-orient: vertical; display: -webkit-box; margin-bottom:16px;">
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
        width: 100%;
        text-align: center;
        ">
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
      message: c[3],
      withdrawable: c[4]
    });
  });

  await contrib.then(result => projectContributions = result).catch(err => notification(`${err}`));
}


function renderProjectDetails(index) {
  console.log('renderProjectDetails 1');
  if(document.getElementById("mainContainer")){
    document.getElementById("mainContainer").style.display = "none"; 
  }
  console.log('renderProjectDetails 2');
  if(document.getElementById("subContainer")){
    document.getElementById("subContainer").innerHTML = "";
  }
  console.log('renderProjectDetails 3');
  if(document.getElementById("subContainer")){
    document.getElementById("subContainer").style.display = "block";
  }
  
  console.log('renderProjectDetails 4');
  // Get a specific project id and render it
  document.title = projects[index].name;
  document.body.scrollTop = 0;  // Scroll to Top - For Safari
  document.documentElement.scrollTop = 0;   // Scroll to Top - For Chrome, Firefox, IE & Opera

  console.log('renderProjectDetails 5');
  const newDiv = document.createElement("div");
  newDiv.className = "detail-body";
  newDiv.innerHTML = projectDetailsTemplate(projects[index]);
  console.log('renderProjectDetails 6');
  document.getElementById("subContainer").innerHTML = '';
  console.log('renderProjectDetails 7');
  document.getElementById("subContainer").appendChild(newDiv);

  console.log('renderProjectDetails 8');

  notificationOff();
}

function projectDetailsTemplate(_project) {
  let projectDate = new Date(_project.timestamp * 1000).toUTCString();

  return `
    <div class="row"
    style="border: 2px solid #2081e2;
    border-radius: 12px;
    box-shadow: rgb(4 17 29 / 25%) 0px 0px 14px 0px;
    margin-bottom:2rem;
    padding:1.5rem;
    ">
    <a class="closeDetails" title="Go Back" href="/"
    style="z-index: 2; border-radius: 12px; margin:auto; color: #fff; background: #2081e2; padding: 15px 10px ; text-align: center; cursor: pointer; font-size: 16px; font-weight: 800; box-shadow: rgb(4 17 29 / 25%) 0px 0px 14px 0px;">
      <i class="bi bi-chevron-double-left"></i> Trở về 
    </a>
      <div class="col-12 image-thumb-banner"  style="background-image: url('${_project.image}'); margin-bottom: 15px; position: relative;">
        <div class="vertical-center" style="width: 100%;">
          <h3 class="title-detail" style="text-align: center;">${_project.name}</h3>
        </div>
      </div>
      <div class="col-md-4" style="width: 53.333333%;">
        <p>
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
              <h5 class="modal-title" id="closeFundModalLabel">⚠️ Chú ý đóng chiến dịch</h5>
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
          </br>
          <div class="col-md-12" style="margin-bottom: 10px;">
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
            <b>Tiến trình: </b> ${((_project.totalFunded.shiftedBy(-ERC20_DECIMALS) / _project.target.shiftedBy(-ERC20_DECIMALS)) * 100).toFixed(2)}<b>%</b>
            <div class="progress">
              <div class="progress-bar progress-bar-striped" role="progressbar" style="width: ${(_project.totalFunded.shiftedBy(-ERC20_DECIMALS) / _project.target.shiftedBy(-ERC20_DECIMALS)) * 100}%" aria-valuenow="${(_project.totalFunded.shiftedBy(-ERC20_DECIMALS) / _project.target.shiftedBy(-ERC20_DECIMALS)) * 100}" aria-valuemin="0" aria-valuemax="100"></div>
            </div>
          </div>
          </br>
          <div class="col-md-6">
            <b>Số tiền đã huy động:</b> ${_project.totalFunded.shiftedBy(-ERC20_DECIMALS).toFixed(2)} cUSD
          </div>
          <div class="col-md-6">
            <b>Trạng thái dự án</b> ${_project.fundingOpen ? "Đang mở" : "Đã đóng"}
          </div>
        </div>
      
        </br>

        ${_project.fundingOpen && _project.funded == false ? 
          `
          <div class="row">
            <div class="col-md-12" style="margin-bottom:0.5rem">
              <label for="fundRange">Mức tiền tài trợ: <b id="rangeVal">${_project.minContrib.shiftedBy(-ERC20_DECIMALS).toFixed(2)}</b> cUSD</label>
              <input type="range" class="form-range fundingRange" min="${_project.minContrib.shiftedBy(-ERC20_DECIMALS).toFixed(2)}" step="${_project.minContrib.shiftedBy(-ERC20_DECIMALS).toFixed(2)}" max="${_project.fundingToTarget.shiftedBy(-ERC20_DECIMALS).toFixed(2)}" value="${_project.minContrib.shiftedBy(-ERC20_DECIMALS).toFixed(2)}" id="fundRange">

              </br>
              <textarea id="message-fund" rows="2" spellcheck="false" style="width: 100%; margin-bottom: 0.0rem; " placeholder="Nhập nội dung lời nhắn"></textarea>
              <div class="row" style="padding: 0.75rem;">
                <a class="fundBtn" id=${_project.index} style="border: 2px solid #2081e2; border-radius: 12px; margin:auto; padding: 12px 47px; background: #2081e2; cursor: pointer; font-size: 16px; font-weight: 800; box-shadow: rgb(4 17 29 / 25%) 0px 0px 14px 0px; color: #fff; ">
                  Tài trợ
                </a>
              </div>
            </div>
          </div>
          
   
          `
        : 
          ``
        }
        ${projectContributions != null && projectContributions.contribs.length > 0 ? 
          `
          <div class="row" style="padding: 0.75rem;">
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
                    Yêu cầu hoàn tiền
                  </button>
                </div>
                <div class="col-md-6">
                  <button class="btn btn-lg btn-outline-dark processRefund fs-6 p-3" id=${_project.index} disabled>
                    Nhận lại tiền
                  </button>
                </div>
              </div>` 
            :
              ``}
          </div>
          </div>
       
          ` 
        : 
          ``
        }
        </br>
        </br>
        </br>
      </div>
      <div class="col-12 comment-box" style="margin-top:1rem;">
      <p style="border-left: 5px solid #2081e2; 
      font-size: 30px;
      font-weight: 800;
      box-shadow: rgb(4 17 29 / 25%) 0px 0px 14px 0px;
      padding-left:1rem;
      ">Bình luận<p>

      <div class="container">
      <div class="comment-box">
      <div class="comment-form" >
          <form action="#" onsubmit="event.preventDefault()">
          <div class="comment-form" style="display:flex; width:100%;height:50px;">
          
          <div style="width:70%;">
        <textarea 
              style="width: 100%;
              height: 50px;
              border: none;
              border-bottom: 2px solid #2081e2;
              outline:none;"
              id="content_comment" rows="3" cols="30" placeholder="Comment" idProject=${_project.index}></textarea>
          </div>
          <button 
          style="width: 10%;
          margin-left: 1rem;
          background: #2081e2;
          border-radius: 10px;
          color: #fff;
          border: 1px;
          font-weight: 800;" class="btnComment" id="btnSubmit">COMMENT</button>
          </div>
          </form>  
      </div>
      <div>
          <div id="comments" style="height: 300px;box-shadow: rgb(4 17 29 / 25%) 0px 0px 14px 0px; margin-top:1rem;">
          </div>
      </div>
      </div>
  </div>
    </div>





    </div>
  `;
}

// Firebase

import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, child, update, remove } from "firebase/database";
// import { initializeApp } from "https://www.gstatic.com/firebasejs/9.1.3/firebase-app.js";
//         import { getDatabase, ref, set, get, child, update, remove } from "https://www.gstatic.com/firebasejs/9.1.3/firebase-database.js";
        // fix cai ni lai thang config cua ban
        const firebaseConfig = {
            apiKey: "AIzaSyAHRD_4CIbwDVZ1adMz20wIyPesD3hsKts",
            authDomain: "test-3dc15.firebaseapp.com",
            databaseURL: "https://test-3dc15-default-rtdb.asia-southeast1.firebasedatabase.app",
            projectId: "test-3dc15",
            storageBucket: "test-3dc15.appspot.com",
            messagingSenderId: "659784768174",
            appId: "1:659784768174:web:1a8749a871d5da4e772b3f",
            measurementId: "G-0F89S93WFL"
        };

        // Initialize Firebase
        const app = initializeApp(firebaseConfig);
        const db = getDatabase();
        const dbRef = ref(db)

        function timeStamp() {
            var now = new Date();
            var date = [now.getMonth() + 1, now.getDate(), now.getFullYear()];
            var time = [now.getHours(), now.getMinutes()];
            var suffix = (time[0] < 12) ? "AM" : "PM";
            time[0] = (time[0] < 12) ? time[0] : time[0] - 12;

            for (var i = 1; i < 3; i++) {
                if (time[i] < 10) {
                time[i] = "0" + time[i];
                }
            }

            return date.join("/") + ", " + time.join(":") + " " + suffix;
        }

        //reference
        // var nameInp = document.getElementById("name");
        var commentTarea = document.getElementById("comment");

        // variable initial
        // function get_acc(i){
        //   return projects[i].name;
        // }
        // var idProject = document.getElementById("content_comment").getAttribute("idProject");
        var idProject = 0;
        var idComment = 0;

        //get comment count
        get(child(dbRef,"comment/"+idProject+"/"+"count")).then((snapshot)=>{
                    if(snapshot.exists()){
                        idComment = snapshot.val()
                    }
                })
         //load comment       
        window.addEventListener('load',(event)=>{
            get(child(dbRef,"comment/"+idProject)).then((snapshot)=>{
                snapshot.forEach((childSnapshot)=>{
                    {
                        if(childSnapshot.val()!=idComment){
                            let name = childSnapshot.val().name
                            let comment = childSnapshot.val().comment
                            let time = childSnapshot.val().time
                            addComment(name,comment,time);
                        }
                    }     
                })  
            });
        });

        
        //post comment
        function postComment() {
          console.log(get_acc());
          var idProject = document.getElementById("content_comment").getAttribute("idProject");
          // var name = document.getElementById("comment_name").value;
          var comment = document.getElementById("content_comment").value;
          // console.log(nameInp.value);
          // console.log(commentTarea.value);
            // var name = nameInp.value,
                // comment = commentTarea.value,
                // time = timeStamp();
           console.log(idProject, name, comment);
                if (name && comment){
                    set(ref(db,"comment/"+idProject+"/"+idComment),{
                    idProject : idProject,
                    idComment : idComment,
                    name: name,
                    comment: comment,
                    // time: time
                    })
                    .then(()=>{
                        idComment++;
                        update(ref(db,"comment/"+idProject),{
                        count: idComment
                        })

                    })
                }
            //clear UI
            // document.getElementById("comment_name").value = '';
            document.getElementById("content_comment").value = '';

            get(child(dbRef,"comment/"+idProject+"/"+idComment)).then((snapshot)=>{
                    if(snapshot.exists()){
                        var comment = snapshot.val();
                        addComment(comment.comment);
                    }
                })
                .catch((error)=>{{
                    alert("unsucessfully,error"+error);
                }})
        }

        //add comment
        function addComment(comment) {
            var comments = document.getElementById("comments");
            if(comments){
            comments.innerHTML = "<p>" + comment + "</p>" + comments.innerHTML;
        }
      }
        //btn event listener
        var btn_sub = document.getElementById("btnSubmit")
        if(btn_sub)
        {
              btn_sub.addEventListener('click',postComment);
        }





function notification(_text) {
  console.log('Notification texxt', _text);
  console.log('Notification alert', document.querySelector(".alert"));
  console.log('Notification notification', document.querySelector("#notification"));
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
    notification(`Thêm dự án "${params[0]}"...`);
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
document.querySelector("#catalogue-close").addEventListener("click", async (e) => {
  if(e.target.className.includes("viewDetails")) {
    await getProjectContributions(parseInt(e.target.id));
    renderProjectDetails(parseInt(e.target.id));
  }
});

document.querySelector("#subContainer").addEventListener("click", async (e) => {
  function closeProjectDetails() {
    console.log('closeProjectDetails');
    document.title = "Crownzy - Gây quỹ cộng đồng trên công nghệ Blockchain";
    console.log('closeProjectDetails 1');
    document.getElementById("mainContainer").style.display = "block";
    console.log('closeProjectDetails 2');
    document.getElementById("subContainer").style.display = "none";
    console.log('closeProjectDetails 3');

    getProjects();
    getBalance();
  };

  if(e.target.className.includes("closeDetails")) {
    closeProjectDetails();
  }
  if(e.target.className.includes("btnComment")) {
    postComment();
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
    const mesageFund = document.getElementById("message-fund").value;
    console.log('mesageFund', mesageFund);
    notification("Đang phê duyệt thanh toán...");
    
    try {
      await approve(price);
    } catch (error) {
      notification(`⚠️ ${error}.`);
    }
    
    notification(`Đang thanh toán cho "${projects[index].name}"...`);
    
    try {
      const result = await contract.methods
        .fundProject(index, price, mesageFund)
        .send({ from: kit.defaultAccount });
      notification(`Bạn đã đầu tư thành công "${projects[index].name}".`);
      // Go back to main projects zone
      // closeProjectDetails();

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

      await getProjectContributions(index);
      renderProjectDetails(index);

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
      // closeProjectDetails();
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
      // closeProjectDetails();
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
      notification(`Yêu cầu của bạn cho việc hoàn tiền "${projects[index].name}" đã được gửi.`);
      // closeProjectDetails();
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
      // closeProjectDetails();
    } catch (error) {
      notification(`⚠️ ${error}.`);
    }
  }

  if(e.target.className.includes("viewContributionDetails")) {
    if(projectContributions.withdrawable && projectContributions.contribs.length > 0) {
      if(document.querySelector(".requestRefund")){
        document.querySelector(".requestRefund").setAttribute("disabled", "disabled");
      }
      if(document.querySelector(".processRefund")){
        document.querySelector(".processRefund").removeAttribute("disabled");
      }
    }
    
    if(document.getElementById("contribSection")){
      document.getElementById("contribSection").removeAttribute("hidden");
    }
    if(document.querySelector(".viewContributionDetails")){
      document.querySelector(".viewContributionDetails").setAttribute("hidden", "hidden");
    }
    
    console.log('Dong gop', projectContributions);
    const contribsList = document.createElement("ul");
    for(let i=0; i < projectContributions.contribs.length; i++){
      const newListItem = document.createElement("li");
      newListItem.innerHTML = `<b>${new BigNumber(projectContributions.contribs[i]).shiftedBy(-ERC20_DECIMALS).toFixed(2)} cUSD</b> - 
        ${new Date(projectContributions.timestamps[i] * 1000).toUTCString()}</br><b>Lời nhắn: </b> <span>${(projectContributions.message != null && projectContributions.message[i] != null ? projectContributions.message[i]: 'Không có')}</span>`;
      contribsList.appendChild(newListItem)
    }
    document.getElementById("contribDetails").appendChild(contribsList);
  }
});