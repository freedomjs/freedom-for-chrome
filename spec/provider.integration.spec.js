var testUtil = require('freedom/spec/util');
var setup = function() {
  testUtil.setSpecBase(window.location.origin + "/scripts/");
  testUtil.setCoreProviders([
    require('freedom/providers/core/core.unprivileged'),
    require('freedom/providers/core/console.unprivileged'),
    require('freedom/providers/core/peerconnection.unprivileged'),
    require('freedom/providers/core/websocket.unprivileged'),
    require('../providers/core.storage')
  ]);
  testUtil.setModuleStrategy(require('freedom/src/link/worker'), '/scripts/freedom-for-chrome.js');
};

var isolated = "providers/storage/isolated/storage.isolated.json";
var shared = "providers/storage/shared/storage.shared.json";
var indexdb = "providers/storage/indexeddb/storage.indexeddb.json";
describe("integration: storage.isolated.json",
    require('freedom/spec/providers/storage/storage.integration.src').bind(this, isolated, setup));
describe("integration: storage.shared.json",
    require('freedom/spec/providers/storage/storage.integration.src').bind(this, shared, setup, false));
describe("integration: storage.indexeddb.json",
    require('freedom/spec/providers/storage/storage.integration.src').bind(this, indexdb, setup));

describe("integration: transport.webrtc.json",
    require('freedom/spec/providers/transport/transport.integration.src').bind(this,
    "providers/transport/webrtc/transport.webrtc.json", setup));

// core.oauth
describe("integration: core.oauth - identity",
    require("freedom/spec/providers/coreIntegration/oauth.integration.src").bind(this,
    require("freedom/providers/core/core.oauth"), 
    [ require("../providers/oauth/oauth.identity") ],
    [ "https://khhlpmfebmkkibipnllkeanfadmigbnj.chromiumapp.org/" ],
    setup));
/**
//@todo current selenium setup only supports Chrome packaged apps
describe("integration: core.oauth - webrequest",
    require("freedom/spec/providers/coreIntegration/oauth.integration.src").bind(this,
    require("freedom/providers/core/core.oauth"),
    [ require("../providers/oauth/oauth.webrequest") ],
    [ "" ],
    setup));
**/

// core.tcpsocket
describe("integration: core.tcpsocket",
    require('freedom/spec/providers/coreIntegration/tcpsocket.integration.src').bind(this,
    require('../providers/core.tcpsocket'), setup));
// core.udpsocket
describe("integration: core.udpsocket",
    require('freedom/spec/providers/coreIntegration/udpsocket.integration.src').bind(this,
    require('../providers/core.udpsocket'), setup));
