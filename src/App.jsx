import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

// HÃY ĐỔI ĐỊA CHỈ HỢP ĐỒNG CỦA BẠN VÀO ĐÂY:
const CONTRACT_ADDRESS = "0x374ED9Db430a015ED7E502ce225459FD13202B46"; 

const CONTRACT_ABI = [
  "function xemSoDu() public view returns (uint256)",
  "function napQuy() public payable",
  "function soLuongYeuCau() public view returns (uint256)",
  "function taoYeuCau(string memory _lyDo, uint256 _soTien, address _nguoiNhan) public",
  "function cacYeuCauRut(uint256) public view returns (uint256 id, string memory lyDo, uint256 soTien, address nguoiNhan, bool lopTruongDongY, bool thuQuyDongY, bool daGiaiNgan)",
  "function lopTruongDuyet(uint256 _id) public",
  "function thucHienRut(uint256 _id) public"
];

const DANH_BA_VI = {
  "0x122E98600B76748A968c1484a1Bb22a7DA22cd49": "Lớp Trưởng",
  "0x7f7aD2F0E0144F062e4285437CbBc12dE621bB07": "Thủ Quỹ",
  "0x336EBf4E9962A3CfB2676F1D034Ef5b1346Cde84": "Sinh viên 1",
  "0xfB38F18F74A6664Ca8a5d0A0C75419C2A0d48644": "Sinh viên 2"
};

function App() {
  const [walletAddress, setWalletAddress] = useState("");
  const [balance, setBalance] = useState("0");
  const [depositAmount, setDepositAmount] = useState("");
  
  const [lyDo, setLyDo] = useState("");
  const [soTien, setSoTien] = useState("");
  const [nguoiNhan, setNguoiNhan] = useState("");

  const [searchId, setSearchId] = useState("");
  const [requestDetails, setRequestDetails] = useState(null);

  useEffect(() => {
    const autoConnect = async () => {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          getFundBalance(); 
        }

        window.ethereum.on('accountsChanged', (accounts) => {
          if (accounts.length > 0) {
            window.location.reload(); 
          } else {
            setWalletAddress(""); 
          }
        });
      }
    };
    autoConnect();
  }, []);

  const getRoleName = (address) => {
    if (!address) return "Thành viên";
    const foundKey = Object.keys(DANH_BA_VI).find(
      key => key.toLowerCase() === address.toLowerCase()
    );
    return foundKey ? DANH_BA_VI[foundKey] : "Thành viên";
  };

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setWalletAddress(accounts[0]);
        getFundBalance();
      } catch (error) {
        console.error("Lỗi kết nối ví:", error);
      }
    } else {
      alert("Vui lòng cài đặt MetaMask!");
    }
  };

  const getFundBalance = async () => {
    if (!window.ethereum) return;
    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    try {
      const balanceWei = await contract.xemSoDu();
      setBalance(ethers.formatEther(balanceWei));
    } catch (error) {
      console.error("Lỗi lấy số dư:", error);
    }
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    if (!window.ethereum || !depositAmount) return;
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    try {
      const tx = await contract.napQuy({ value: ethers.parseEther(depositAmount) });
      await tx.wait(); 
      alert("Nộp quỹ thành công!");
      setDepositAmount("");
      getFundBalance(); 
    } catch (error) {
      alert("Giao dịch nạp tiền thất bại!");
    }
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!window.ethereum || !lyDo || !soTien || !nguoiNhan) return;
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    try {
      const amountInWei = ethers.parseEther(soTien);
      const tx = await contract.taoYeuCau(lyDo, amountInWei, nguoiNhan);
      await tx.wait();
      alert("Thủ quỹ tạo yêu cầu rút tiền thành công!");
      setLyDo("");
      setSoTien("");
      setNguoiNhan("");
    } catch (error) {
      alert("Tạo yêu cầu thất bại! (Lưu ý: Chỉ tài khoản Thủ Quỹ mới được tạo)");
    }
  };

  const handleSearchRequest = async (e) => {
    e.preventDefault();
    if (!window.ethereum || searchId === "") return;
    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    try {
      const req = await contract.cacYeuCauRut(searchId);
      if (req[1] === "") {
        alert("Yêu cầu này trống hoặc chưa được khởi tạo!");
        setRequestDetails(null);
        return;
      }
      setRequestDetails({
        id: req[0].toString(),
        lyDo: req[1],
        soTien: ethers.formatEther(req[2]),
        nguoiNhan: req[3],
        lopTruongDuyet: req[4],
        thuQuyDuyet: req[5],
        daGiaiNgan: req[6]
      });
    } catch (error) {
      alert("Không tìm thấy dữ liệu yêu cầu!");
    }
  };

  const handleApproveRequest = async () => {
    if (!window.ethereum || !requestDetails) return;
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    try {
      const tx = await contract.lopTruongDuyet(requestDetails.id);
      await tx.wait();
      alert("Lớp Trưởng đã ký duyệt thành công!");
      handleSearchRequest({ preventDefault: () => {} });
    } catch (error) {
      alert("Duyệt thất bại! (Chỉ ví Lớp Trưởng mới có quyền)");
    }
  };

  const handleExecuteWithdraw = async () => {
    if (!window.ethereum || !requestDetails) return;
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    try {
      const tx = await contract.thucHienRut(requestDetails.id);
      await tx.wait();
      alert("Giải ngân quỹ lớp thành công! Tiền đã được chuyển.");
      getFundBalance();
      handleSearchRequest({ preventDefault: () => {} });
    } catch (error) {
      alert("Giải ngân thất bại! Hãy chắc chắn đã có đủ chữ ký duyệt của Lớp Trưởng và Thủ Quỹ.");
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-800 pb-16 selection:bg-indigo-100">
      {/* Header Glassmorphism */}
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-md border-b border-slate-200/60 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
              <span className="text-xl">🎓</span>
            </div>
            <h1 className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 tracking-tight">
              ClassFund dApp
            </h1>
          </div>
          
          {walletAddress ? (
            <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="bg-amber-100 text-amber-800 px-4 py-1.5 rounded-xl font-bold text-sm">
                👤 {getRoleName(walletAddress)}
              </span>
              <div className="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-xl font-semibold text-sm flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </div>
            </div>
          ) : (
            <button onClick={connectWallet} className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-slate-500/20 hover:-translate-y-0.5 flex items-center gap-2">
              <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" alt="MetaMask" className="w-5 h-5" />
              Kết nối ví
            </button>
          )}
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* CỘT TRÁI */}
        <div className="lg:col-span-4 space-y-8">
          {/* Card Số dư (Gradient bóng bẩy) */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 p-8 text-white shadow-[0_8px_30px_rgb(79,70,229,0.3)]">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
            <h2 className="text-sm font-medium uppercase tracking-widest text-indigo-100 mb-2">Tổng Số Dư Quỹ</h2>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-5xl font-black tracking-tight">{balance}</span>
              <span className="text-xl font-bold text-indigo-200">ETH</span>
            </div>
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/20 text-xs font-medium">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
              Sepolia Testnet
            </div>
          </div>

          {/* Card Nạp Tiền */}
          <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-8 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
            <h3 className="text-xl font-extrabold text-slate-800 mb-6 flex items-center gap-2">
              <span className="text-2xl">💰</span> Đóng Góp Quỹ
            </h3>
            <form onSubmit={handleDeposit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Số tiền (ETH)</label>
                <input 
                  type="number" step="any" placeholder="0.00" value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full px-5 py-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:outline-none transition-all text-lg font-medium text-slate-700"
                />
              </div>
              <button type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-3.5 rounded-xl font-bold text-base transition-all duration-300 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5">
                Xác Nhận Nạp Tiền
              </button>
            </form>
          </div>
        </div>

        {/* CỘT PHẢI */}
        <div className="lg:col-span-8 space-y-8">
          {/* Card Tạo Yêu Cầu */}
          <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-8 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
            <h3 className="text-xl font-extrabold text-slate-800 mb-6 flex items-center gap-2">
              <span className="text-2xl">📝</span> Tạo Hóa Đơn Rút Tiền 
              <span className="ml-2 text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-md font-medium">Quyền Thủ Quỹ</span>
            </h3>
            <form onSubmit={handleCreateRequest} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Lý do chi tiêu</label>
                <input 
                  type="text" placeholder="VD: Mua phần thưởng cuối kỳ..." value={lyDo}
                  onChange={(e) => setLyDo(e.target.value)}
                  className="w-full px-5 py-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Số tiền rút (ETH)</label>
                <input 
                  type="number" step="any" placeholder="0.00" value={soTien}
                  onChange={(e) => setSoTien(e.target.value)}
                  className="w-full px-5 py-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:outline-none transition-all font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Ví người nhận</label>
                <input 
                  type="text" placeholder="0x..." value={nguoiNhan}
                  onChange={(e) => setNguoiNhan(e.target.value)}
                  className="w-full px-5 py-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:outline-none transition-all font-mono text-sm"
                />
              </div>
              <div className="md:col-span-2 pt-2">
                <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-slate-500/20 hover:-translate-y-0.5">
                  Gửi Yêu Cầu Lên Mạng Lưới
                </button>
              </div>
            </form>
          </div>

          {/* Card Tra Cứu */}
          <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-8 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
            <h3 className="text-xl font-extrabold text-slate-800 mb-6 flex items-center gap-2">
              <span className="text-2xl">🔍</span> Tra Cứu & Phê Duyệt
            </h3>
            <form onSubmit={handleSearchRequest} className="flex gap-3 mb-6">
              <input 
                type="number" placeholder="Nhập ID hóa đơn (VD: 0)" value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                className="flex-1 px-5 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:outline-none transition-all font-medium"
              />
              <button type="submit" className="bg-white border-2 border-slate-200 hover:border-slate-800 text-slate-800 px-8 py-3 rounded-xl font-bold transition-all">
                Tìm Kiếm
              </button>
            </form>

            {requestDetails && (
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200/60">
                <div className="flex justify-between items-center border-b border-slate-200 pb-4 mb-4">
                  <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Hóa Đơn #{requestDetails.id}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${requestDetails.daGiaiNgan ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {requestDetails.daGiaiNgan ? "ĐÃ HOÀN TẤT" : "ĐANG CHỜ XỬ LÝ"}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 mb-6">
                  <div>
                    <div className="text-xs font-bold text-slate-400 uppercase mb-1">Mục đích chi</div>
                    <div className="font-semibold text-slate-800 text-lg">{requestDetails.lyDo}</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-400 uppercase mb-1">Số tiền</div>
                    <div className="font-black text-indigo-600 text-lg">{requestDetails.soTien} ETH</div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-xs font-bold text-slate-400 uppercase mb-1">Ví người thụ hưởng</div>
                    <div className="font-mono text-sm text-slate-600 bg-white p-2 rounded-lg border border-slate-200 break-all">{requestDetails.nguoiNhan}</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className={`flex flex-col justify-center items-center p-3 rounded-xl border ${requestDetails.lopTruongDuyet ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-500'}`}>
                    <span className="text-xs font-bold uppercase mb-1">Lớp Trưởng</span>
                    <span className="font-semibold">{requestDetails.lopTruongDuyet ? "✓ Đã Ký Duyệt" : "⏳ Chờ Ký"}</span>
                  </div>
                  <div className={`flex flex-col justify-center items-center p-3 rounded-xl border ${requestDetails.thuQuyDuyet ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-500'}`}>
                    <span className="text-xs font-bold uppercase mb-1">Thủ Quỹ</span>
                    <span className="font-semibold">{requestDetails.thuQuyDuyet ? "✓ Đã Ký Duyệt" : "⏳ Chờ Ký"}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button 
                    onClick={handleApproveRequest}
                    disabled={requestDetails.lopTruongDuyet || requestDetails.daGiaiNgan}
                    className={`py-3.5 px-4 rounded-xl font-bold transition-all duration-300 ${
                      requestDetails.lopTruongDuyet || requestDetails.daGiaiNgan
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' 
                        : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 hover:-translate-y-0.5'
                    }`}
                  >
                    ✒️ Ký Duyệt (Lớp Trưởng)
                  </button>
                  <button 
                    onClick={handleExecuteWithdraw}
                    disabled={requestDetails.daGiaiNgan}
                    className={`py-3.5 px-4 rounded-xl font-bold transition-all duration-300 ${
                      requestDetails.daGiaiNgan 
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' 
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 hover:-translate-y-0.5'
                    }`}
                  >
                    🚀 Thực Hiện Giải Ngân
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;