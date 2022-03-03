"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var ethers_1 = require("ethers");
var node_fetch_1 = require("node-fetch");
var node_ts_cache_1 = require("node-ts-cache");
var node_ts_cache_storage_memory_1 = require("node-ts-cache-storage-memory");
var cache = new node_ts_cache_1.CacheContainer(new node_ts_cache_storage_memory_1.MemoryStorage());
// TODO: import Margin entity
// REST calls to an external API
var getHistoricalRates = function (symbol) { return __awaiter(void 0, void 0, void 0, function () {
    var startTime, endTime, resolution, base, query, cachedRates, rates, err_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                startTime = new Date("2021-06-01T00:00:00Z").toISOString();
                endTime = new Date().toISOString();
                resolution = "1D";
                base = "https://app.sense.finance/api/v0.1/rates/".concat(symbol, "/series");
                query = "".concat(base, "?from=").concat(startTime, "&to=").concat(endTime, "&resolution=").concat(resolution);
                return [4 /*yield*/, cache.getItem(query)];
            case 1:
                cachedRates = _a.sent();
                if (cachedRates) {
                    return [2 /*return*/, cachedRates];
                }
                _a.label = 2;
            case 2:
                _a.trys.push([2, 5, , 6]);
                return [4 /*yield*/, (0, node_fetch_1["default"])(query).then(function (resp) { return resp.json(); })];
            case 3:
                rates = _a.sent();
                return [4 /*yield*/, cache.setItem(query, rates, { isCachedForever: true })];
            case 4:
                _a.sent(); // ttl?
                return [2 /*return*/, rates];
            case 5:
                err_1 = _a.sent();
                console.error(err_1);
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); };
var getLatestRates = function (symbol) { return __awaiter(void 0, void 0, void 0, function () {
    var query, cachedRates, rates;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                query = "https://app.sense.finance/api/v0.1/rates/".concat(symbol, "/latest");
                return [4 /*yield*/, cache.getItem(query)];
            case 1:
                cachedRates = _a.sent();
                if (cachedRates) {
                    console.log("Cache hit for key ".concat(query));
                    return [2 /*return*/, cachedRates];
                }
                return [4 /*yield*/, (0, node_fetch_1["default"])(query).then(function (resp) { return resp.json(); })];
            case 2:
                rates = _a.sent();
                // const rates = await fetch(query);
                return [4 /*yield*/, cache.setItem(query, rates, { ttl: 60 })];
            case 3:
                // const rates = await fetch(query);
                _a.sent();
                return [2 /*return*/, rates];
        }
    });
}); };
// JSONRPC calls to an external contract or the blockchain itself
var getProvider = function (network) { return __awaiter(void 0, void 0, void 0, function () {
    var provider;
    return __generator(this, function (_a) {
        provider = new ethers_1.ethers.providers.JsonRpcProvider(network);
        return [2 /*return*/, provider];
    });
}); };
var getCurrentBlock = function (network) { return __awaiter(void 0, void 0, void 0, function () {
    var provider, blockNumber;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, getProvider(network)];
            case 1:
                provider = _a.sent();
                return [4 /*yield*/, provider.getBlockNumber()];
            case 2:
                blockNumber = _a.sent();
                return [2 /*return*/, blockNumber];
        }
    });
}); };
var getWalletBalance = function (network, address) { return __awaiter(void 0, void 0, void 0, function () {
    var provider, balanceInWei, balanceInEth;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, getProvider(network)];
            case 1:
                provider = _a.sent();
                return [4 /*yield*/, provider.getBalance(address)];
            case 2:
                balanceInWei = _a.sent();
                balanceInEth = ethers_1.ethers.utils.formatEther(balanceInWei);
                return [2 /*return*/, balanceInEth];
        }
    });
}); };
var getEnsName = function (network, address) { return __awaiter(void 0, void 0, void 0, function () {
    var provider, name, resolvedAddress;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, getProvider(network)];
            case 1:
                provider = _a.sent();
                return [4 /*yield*/, provider.lookupAddress(address)];
            case 2:
                name = _a.sent();
                if (!name) return [3 /*break*/, 4];
                return [4 /*yield*/, provider.resolveName(name)];
            case 3:
                resolvedAddress = _a.sent();
                if (resolvedAddress == address) {
                    return [2 /*return*/, name];
                }
                _a.label = 4;
            case 4: return [2 /*return*/];
        }
    });
}); };
var getAddressFromEnsName = function (network, name) { return __awaiter(void 0, void 0, void 0, function () {
    var provider, address;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, getProvider(network)];
            case 1:
                provider = _a.sent();
                return [4 /*yield*/, provider.resolveName(name)];
            case 2:
                address = _a.sent();
                return [2 /*return*/, address];
        }
    });
}); };
var getAvatar = function (network, address) { return __awaiter(void 0, void 0, void 0, function () {
    var provider, avatar;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, getProvider(network)];
            case 1:
                provider = _a.sent();
                return [4 /*yield*/, provider.getAvatar(address)];
            case 2:
                avatar = _a.sent();
                return [2 /*return*/, avatar];
        }
    });
}); };
// JSONRPC calls to the Voltz Periphery contracts
var getMinimumMarginRequirement = function (recipient, tickLower, tickUpper, amount, vammAddress) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/];
    });
}); };
// JSONRPC calls to the Voltz Core contracts
// TODO: Resource CRUD (pending transactions, misc account metadata)
// async function () {
// }
void function () {
    return __awaiter(this, void 0, void 0, function () {
        var network, ensName, _a, _b, _c, address, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w;
        return __generator(this, function (_x) {
            switch (_x.label) {
                case 0:
                    network = "https://eth-mainnet.alchemyapi.io/v2/pNmKK8pTXHVggw2X4XPAOOuL9SllmxdZ";
                    ensName = "vitalik.eth";
                    _b = (_a = console).log;
                    _c = "Current block: ".concat;
                    return [4 /*yield*/, getCurrentBlock(network)];
                case 1:
                    _b.apply(_a, [_c.apply("Current block: ", [_x.sent()])]);
                    return [4 /*yield*/, getAddressFromEnsName(network, ensName)];
                case 2:
                    address = _x.sent();
                    console.log("Address: ".concat(address));
                    address = address || "0xd8da6bf26964af9d7eed9e03e53415d37aa96045";
                    _e = (_d = console).log;
                    _f = "Wallet balance: ".concat;
                    return [4 /*yield*/, getWalletBalance(network, ensName)];
                case 3:
                    _e.apply(_d, [_f.apply("Wallet balance: ", [_x.sent()])]);
                    _h = (_g = console).log;
                    _j = "ENS name: ".concat;
                    return [4 /*yield*/, getEnsName(network, address)];
                case 4:
                    _h.apply(_g, [_j.apply("ENS name: ", [_x.sent()])]);
                    _l = (_k = console).log;
                    _m = "Avatar: ".concat;
                    return [4 /*yield*/, getAvatar(network, address)];
                case 5:
                    _l.apply(_k, [_m.apply("Avatar: ", [_x.sent()])]);
                    _p = (_o = console).log;
                    _q = ["Historical Rates: %j"];
                    return [4 /*yield*/, getHistoricalRates("cDAI")];
                case 6:
                    _p.apply(_o, _q.concat([_x.sent()]));
                    _s = (_r = console).log;
                    _t = ["Latest Rates: %j"];
                    return [4 /*yield*/, getLatestRates("cDAI")];
                case 7:
                    _s.apply(_r, _t.concat([_x.sent()]));
                    _v = (_u = console).log;
                    _w = ["Latest Rates: %j"];
                    return [4 /*yield*/, getLatestRates("cDAI")];
                case 8:
                    _v.apply(_u, _w.concat([_x.sent()]));
                    return [2 /*return*/];
            }
        });
    });
}();
