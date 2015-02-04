var testUtil = require('freedom/spec/util');
var setup = function() {
  testUtil.setSpecBase(window.location.origin + "/scripts/");
  testUtil.setCoreProviders([
    require('freedom/providers/core/core.unprivileged'),
    require('freedom/providers/core/core.console'),
    require('freedom/providers/core/core.peerconnection'),
    require('freedom/providers/core/core.websocket'),
    require('../providers/core.storage')
  ]);
  testUtil.setModuleStrategy(require('freedom/src/link/worker'), '/scripts/freedom-for-chrome.js');
};

// Social
describe("integration-single: social.loopback.json", require("freedom/spec/providers/social/social.single.integration.src")
  .bind(this, window.freedom, "scripts/providers/social/loopback/social.loopback.json"), {});
describe("integration-single: social.ws.json", require("freedom/spec/providers/social/social.single.integration.src")
  .bind(this, window.freedom, "scripts/providers/social/websocket-server/social.ws.json", {}));
describe("integration-double: social.ws.json", require("freedom/spec/providers/social/social.double.integration.src")
  .bind(this, window.freedom, "scripts/providers/social/websocket-server/social.ws.json", {}));

// Storage
describe("integration: storage.isolated.json", require("freedom/spec/providers/storage/storage.integration.src")
  .bind(this, window.freedom, "scripts/providers/storage/isolated/storage.isolated.json", {}, false));
describe("integration: storage.shared.json", require("freedom/spec/providers/storage/storage.integration.src")
  .bind(this, window.freedom, "scripts/providers/storage/shared/storage.shared.json", {}, false));
/**
var isolated = "providers/storage/isolated/storage.isolated.json";
var shared = "providers/storage/shared/storage.shared.json";
var indexdb = "providers/storage/indexeddb/storage.indexeddb.json";
describe("integration: storage.isolated.json",
    require('freedom/spec/providers/storage/storage.integration.src').bind(this, isolated, setup));
describe("integration: storage.shared.json",
    require('freedom/spec/providers/storage/storage.integration.src').bind(this, shared, setup, false));
describe("integration: storage.indexeddb.json",
    require('freedom/spec/providers/storage/storage.integration.src').bind(this, indexdb, setup));
**/

// Transport
describe("integration: transport.webrtc.json",
    require('freedom/spec/providers/transport/transport.integration.src').bind(this,
    "providers/transport/webrtc/transport.webrtc.json", setup));

// core.rtcpeerconnection
describe("integration: core.rtcpeerconnection",
    require("freedom/spec/providers/coreIntegration/rtcpeerconnection.integration.src").bind(this,
    require("freedom/providers/core/core.rtcpeerconnection"),
    require("freedom/providers/core/core.rtcdatachannel"), setup));

// core.xhr
describe("integration: core.xhr",
    require("freedom/spec/providers/coreIntegration/xhr.integration.src").bind(this,
    require("freedom/providers/core/core.xhr"), setup));

// core.tcpsocket
describe("integration: core.tcpsocket",
    require('freedom/spec/providers/coreIntegration/tcpsocket.integration.src').bind(this,
    require('../providers/core.tcpsocket'), setup));

// core.udpsocket
describe("integration: core.udpsocket",
    require('freedom/spec/providers/coreIntegration/udpsocket.integration.src').bind(this,
    require('../providers/core.udpsocket'), setup));

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

