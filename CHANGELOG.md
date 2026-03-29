# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0](https://github.com/ironyh/VueSIP/compare/v1.1.0...v1.2.0) (2026-03-29)


### Features

* add ConnectionTestButton to PWA softphone header ([a07027a](https://github.com/ironyh/VueSIP/commit/a07027adb14acf651c12675a69eb358a42a9fae2))
* add isWebRtcError helper for WebRTC error detection ([628e0b8](https://github.com/ironyh/VueSIP/commit/628e0b8ea20b9e1e3ae527135defddd71ac22c64))
* add unit tests for useSuggester composable ([ab071aa](https://github.com/ironyh/VueSIP/commit/ab071aaa91b7fe989c3fb3bd9fd8d626b77794dc))
* Add useCallRecording composable for WebRTC call recording ([0bee3d1](https://github.com/ironyh/VueSIP/commit/0bee3d1eba50f8af46ee406af84330d99361d366))
* add usePushNotifications PWA composable ([076fab2](https://github.com/ironyh/VueSIP/commit/076fab2fb99989f8c813d78391ef3f6dc874cb93))
* **api:** export constants from main entry point ([da30303](https://github.com/ironyh/VueSIP/commit/da30303c4c0cefd7f27a16d5f5195f7c8c2deb6d))
* **CallSession:** add last error diagnostics properties ([3726975](https://github.com/ironyh/VueSIP/commit/37269754a2c923f9ec4eee7fd953df23fe68b972))
* **ci:** add npm audit security automation workflow ([39cccb3](https://github.com/ironyh/VueSIP/commit/39cccb354fe9f8d0049f5d38bfea8a553b032031))
* **composables:** add useConnectionTest for pre-call diagnostics ([442d074](https://github.com/ironyh/VueSIP/commit/442d0747ba3d0e5ec3c63900229c720df0c525f4))
* **composables:** export useCallQualityStats ([b687c21](https://github.com/ironyh/VueSIP/commit/b687c21307ef2567df99bd272f50570c2135c49b))
* **composables:** improve useMediaDevices error messages with codes and guidance ([f649be1](https://github.com/ironyh/VueSIP/commit/f649be198720d16fcba6ad7b9b91b93dd33a88f9))
* **constants:** add network quality levels and thresholds ([20fc95f](https://github.com/ironyh/VueSIP/commit/20fc95f5634ae94482fddd7ce898e5c7cbab6306))
* **demos:** add automated health monitoring ([734a55b](https://github.com/ironyh/VueSIP/commit/734a55bb9dcc9b18639ea7716c08838ea284ad8d))
* **encryption:** add sanitizeForLogs utility for safe logging ([eaf3417](https://github.com/ironyh/VueSIP/commit/eaf3417d6863cf0ebf3dbf084a9ce2e2638127ac))
* **env:** add browser and OS detection utilities ([1b7ac6e](https://github.com/ironyh/VueSIP/commit/1b7ac6e72e3bbfbfc48f151e411d6cac7b8bad8d))
* **env:** add isBrowser() utility for environment detection ([40948c6](https://github.com/ironyh/VueSIP/commit/40948c618b1a866a3dde26163471591f1a2e017c))
* **env:** add isIframe utility for embed detection ([1688e1c](https://github.com/ironyh/VueSIP/commit/1688e1c1de1569c1a3941e582cf0fc8ad3f678bb))
* **env:** add isMobileDevice() utility for mobile browser detection ([ea55ab9](https://github.com/ironyh/VueSIP/commit/ea55ab9c22cc8214d8b3d449502531d15b321c3a))
* **env:** add isSecureContext for WebRTC requirement detection ([a595cb9](https://github.com/ironyh/VueSIP/commit/a595cb948cf433a83f40fc7120e226f30662247a))
* **env:** add isWebRTCSupported utility function ([c8ea224](https://github.com/ironyh/VueSIP/commit/c8ea2240c9e2621ea25aa7fb1a91672d43bdf6f5))
* **errorHelpers:** add DOMException type guards ([66bbb4d](https://github.com/ironyh/VueSIP/commit/66bbb4d30ce7fc989fb39a0f5e1dd80d84984f91))
* **errorHelpers:** add isRangeError, isSyntaxError, isReferenceError type guards ([ccc9ab1](https://github.com/ironyh/VueSIP/commit/ccc9ab1539765946518ad1da205a67dfc78cb193))
* **errorHelpers:** add isSipStatusCodeError type guard for SIP error detection ([add70d1](https://github.com/ironyh/VueSIP/commit/add70d19a9dfa4f81da33cb42dc4ad4409613930))
* **errorHelpers:** add isTimeoutError type guard ([f3786bd](https://github.com/ironyh/VueSIP/commit/f3786bd2cca77dea1ee416ed9afd205c856eccd8))
* **EventEmitter:** add getHandlers method for testing and debugging ([9513f61](https://github.com/ironyh/VueSIP/commit/9513f6197e6b0d83041eeb8d51dee795b2f665c1))
* **EventEmitter:** add hasListener method for checking specific handlers ([01322de](https://github.com/ironyh/VueSIP/commit/01322de6f8f8deecd097e19bb0e5dc830d6c3ae4))
* export quality report utilities from main API ([4085ec8](https://github.com/ironyh/VueSIP/commit/4085ec8d1084f4100b9d640b12858ba954f3f00d))
* **exports:** add missing 46elks API service exports ([d85e2a9](https://github.com/ironyh/VueSIP/commit/d85e2a93b84edad35121ab41024e8c34aa192c1f))
* **formatters:** add clamp utility function ([6b23477](https://github.com/ironyh/VueSIP/commit/6b23477e8bf65a242a0a23b5706531d7921c0885))
* **formatters:** add formatMilliseconds utility for WebRTC stats ([f728610](https://github.com/ironyh/VueSIP/commit/f7286104f4253d6d889de0bf0cc7b9e8b560e0c1))
* **formatters:** add formatSipStatusCode for human-readable SIP status messages ([7792fd4](https://github.com/ironyh/VueSIP/commit/7792fd4483a23baa1c3c4932d3808b900197770b))
* **formatters:** add multi-country phone number formatting support ([15e853f](https://github.com/ironyh/VueSIP/commit/15e853f1b2bd8e4a515620d2ba67e0a5ac6e231e))
* **formatters:** add parseQueryString utility function ([7dd652d](https://github.com/ironyh/VueSIP/commit/7dd652d2975daf8200b3d58d055f4dc8c9dfafa4))
* improve coverage diff workflow, raise bundle thresholds, add CRM/TransportManager tests ([75e93e9](https://github.com/ironyh/VueSIP/commit/75e93e938f2feb90891b2c1cec6d29ebb01fc715))
* **index:** export IceConnectionState and IceGatheringState types ([91fa324](https://github.com/ironyh/VueSIP/commit/91fa32477d25a955b254351382676d444e29d20e))
* **mediamanager:** ICE connection state transition logging with correlation IDs ([1f4aa4a](https://github.com/ironyh/VueSIP/commit/1f4aa4ab624c34c32d9d394b0e2d85bbd409ca90))
* **overlay:** add CallFailureOverlay component for call diagnostics ([329842f](https://github.com/ironyh/VueSIP/commit/329842fe887f9a6d08d19f58668a1b53f0f26365))
* **pwa-softphone:** add QR provisioning settings tab ([062400c](https://github.com/ironyh/VueSIP/commit/062400c93b1d4d19b9ee96e98a1b4d2ba2ce1ded))
* **pwa-softphone:** add record button and controls to CallScreen ([5c54652](https://github.com/ironyh/VueSIP/commit/5c5465219de1d1001193b53cbdb9dd47c97ea526))
* **pwa-softphone:** wire DiagnosticsPanel to real-time SipClient data (Phase 1) ([f7ed0ad](https://github.com/ironyh/VueSIP/commit/f7ed0ad3e13b1f14f38ac60d021a450abfed1bb5))
* **pwa:** add early media permission check to reduce first-call friction ([90be920](https://github.com/ironyh/VueSIP/commit/90be92066de9b2ae9ea9d97ddb81cd4323c8a1b5))
* **recording:** auto-start recording when persistence enabled and call becomes active ([8a76c6b](https://github.com/ironyh/VueSIP/commit/8a76c6bed86391950a105f7a58dfe3490ad097f4))
* **scripts:** add health monitoring cron script ([165c8ac](https://github.com/ironyh/VueSIP/commit/165c8ac3fe44d1378e919eb607adbf782ccb2e53))
* **suggester:** add triageQuestionBank as shared TypeScript utility ([f7039ba](https://github.com/ironyh/VueSIP/commit/f7039ba65f20dfc88165e426787f4bd062c491ab))
* **suggester:** add useSuggester composable + SuggesterChip/SuggesterPanel components ([08d821e](https://github.com/ironyh/VueSIP/commit/08d821e090449424103c4e4d346af3eb76f1c89d))
* **template:** add call recording to CallScreen ([a911b2f](https://github.com/ironyh/VueSIP/commit/a911b2fb29f11f7a043f8357ddb25ca35bb67947))
* **testing:** add createDeferred utility and tests ([53f7f1d](https://github.com/ironyh/VueSIP/commit/53f7f1d10d27f55e208e47d5d08ee4096b9f82b8))
* **testing:** add waitFor async condition utilities ([ba91480](https://github.com/ironyh/VueSIP/commit/ba914809967935e2d997df127d195393a7e0d445))
* **testing:** export waitFor utilities from main index ([465d217](https://github.com/ironyh/VueSIP/commit/465d217dcb8217bb15922ae23af8b114d81a6773))
* **utils:** add extended SIP URI parsing utilities ([e882528](https://github.com/ironyh/VueSIP/commit/e88252801eed53aebe4f0b93503a637a2b5bac3e))
* **utils:** add isDevelopmentMode() environment utility ([bd0d023](https://github.com/ironyh/VueSIP/commit/bd0d0235cd56eda0aa1521d6d254c5e405f68b11))
* **utils:** add isNetworkError helper for error handling ([5fdfe7c](https://github.com/ironyh/VueSIP/commit/5fdfe7c3def3ba0554c5424fc741646cae1598dd))
* **utils:** add isProductionMode() environment utility ([81e2142](https://github.com/ironyh/VueSIP/commit/81e21425541dc898c0e47b314b84501241c65164))
* **utils:** add PWA and service worker detection utilities ([7ef7bc9](https://github.com/ironyh/VueSIP/commit/7ef7bc9dd255c10bbfe18006397c67e64391c3ee))
* **utils:** add runtime input validation for callDiagnostics suggestions ([fbd7590](https://github.com/ironyh/VueSIP/commit/fbd7590b4fa448d5b3afef6156e15c8311bd6008))
* **utils:** add SIP/WebRTC error helpers for reliability ([c79597a](https://github.com/ironyh/VueSIP/commit/c79597a94dd082b002e4c21cf334e82e62894bcf))
* **utils:** export callDiagnostics utilities from main index ([7bf54c9](https://github.com/ironyh/VueSIP/commit/7bf54c95be3898c92cc9d65f61f9b45a1e1facce))
* **utils:** export qualityReport utilities from index ([7c2574d](https://github.com/ironyh/VueSIP/commit/7c2574d054472958db8359b2b13e7595b624003d))
* **utils:** export SimpleValidationResult type ([31e7269](https://github.com/ironyh/VueSIP/commit/31e72696970fd05806f99515ea5ce372b4f82a68))
* **validators:** add validateUrl utility for general URL validation ([2dcfcce](https://github.com/ironyh/VueSIP/commit/2dcfcce9a10f6bad0b374c518ae122e5a7ff4e59))


### Bug Fixes

* add missing Vue type imports in useMediaPermissions ([bbb1cd8](https://github.com/ironyh/VueSIP/commit/bbb1cd8a72959a69b4c8cdb5c36248bc5097bec5))
* add picomatch override to resolve security audit failure ([7ecc0cb](https://github.com/ironyh/VueSIP/commit/7ecc0cb52c42a2651adbc93b41f1881b9092f546))
* **amiservice:** fix auto-reconnect memory leak and broken reconnect handler ([6ff390f](https://github.com/ironyh/VueSIP/commit/6ff390f160d1bcafefd531f4295ba540fe201799))
* apply rtcConfiguration to incoming call answers (ICE candidates) ([2c13433](https://github.com/ironyh/VueSIP/commit/2c13433245f40c1327c54a7c19ddfb12b1ec6354))
* **bundle-size:** correct thresholds — was always failing (~2500KB vs 500KB limit) ([692bf2c](https://github.com/ironyh/VueSIP/commit/692bf2c901f77f83e8dd9e376f079097e4187f11))
* **CallScreen:** add missing pauseRecording and resumeRecording imports ([e5e3995](https://github.com/ironyh/VueSIP/commit/e5e39956ca006cc5455a72a0dbfc894368c782f6))
* **cdr:** resolve 3 TypeCheckErrors in performance tests ([0e6d054](https://github.com/ironyh/VueSIP/commit/0e6d0549f602da9f19beb97a6772c88b02c2256d))
* **ci:** add checkout step to PR Staleness Monitor workflow ([2447277](https://github.com/ironyh/VueSIP/commit/2447277352ccc9817a92c7fe76dfe07f8e8157dc))
* **ci:** add checkout step to Release workflow to fix commit creation error ([7b4fd04](https://github.com/ironyh/VueSIP/commit/7b4fd04043e20d8755670590cc94d8bc4f7f1ebe))
* **ci:** align pnpm/action-setup version to 9.14.2 in flaky-test-detector ([8c1f459](https://github.com/ironyh/VueSIP/commit/8c1f459b8cbf672fef44087ffd97d6f35c4a0249))
* **ci:** correct Jules action reference from jules-invoke@v1 to jules-action@v1.0.0 ([13e7f05](https://github.com/ironyh/VueSIP/commit/13e7f051a3077f2443d4c230ba431465ce942485))
* **ci:** document required repository setting for release workflow ([70d37fc](https://github.com/ironyh/VueSIP/commit/70d37fcbcdceaebe6d1c8fe184dadb52a8d20e7c))
* **ci:** flaky-test-detector heredoc EOF error and coverage-diff git checkout failure ([e38d95c](https://github.com/ironyh/VueSIP/commit/e38d95c9940e81945494859dc63d4d4fdd5f5b4c))
* **ci:** improve Release workflow token diagnostic and add Node24 workaround ([c170dd3](https://github.com/ironyh/VueSIP/commit/c170dd3dd8426cc2de17f6af9b1e740726f2fc5a))
* **CI:** remove deprecated --ext flag from enterprise lint and add flatted override ([c435779](https://github.com/ironyh/VueSIP/commit/c43577996fc05d0f3cc21adaa05d6637cf73b7cb))
* **ci:** remove ignoreDeprecations (vue-tsc v2 rejects it) ([a18a65a](https://github.com/ironyh/VueSIP/commit/a18a65ad2a99b516d99751b118537f22e2646bc6))
* **ci:** skip mobile E2E tests on PRs due to consistent timeouts ([22ce594](https://github.com/ironyh/VueSIP/commit/22ce5941ba9281a5f61f251d88f2a84bd19fc709))
* **ci:** skip mobile E2E tests on PRs due to consistent timeouts ([7afdc80](https://github.com/ironyh/VueSIP/commit/7afdc801c47a74ce02c64c938783952490452cc2))
* **ci:** suppress tsconfig baseUrl deprecation warning for TS 5.x ([232248b](https://github.com/ironyh/VueSIP/commit/232248b80ff8079ff2fe806b9928a365e0b2878c))
* **ci:** suppress tsconfig baseUrl deprecation warning for TS 6+ ([2f5d81c](https://github.com/ironyh/VueSIP/commit/2f5d81c72a229f48b78ac08391700845304a7771))
* **ci:** use explicit setOutput for commentId to prevent NaN in PATCH URL ([8287a8a](https://github.com/ironyh/VueSIP/commit/8287a8ace4c276a90904e8a5da77a51918d75496))
* clamp returns max when min &gt; max ([5ad4087](https://github.com/ironyh/VueSIP/commit/5ad40872dff88a85f6af5db872626827631036de))
* complete OAuth2 mock for test coverage ([ea8dcdf](https://github.com/ironyh/VueSIP/commit/ea8dcdf37faf48cc251587631e2f00abbe2c1306))
* **constants:** add 'unknown' to NETWORK_QUALITY_LEVELS ([00b7581](https://github.com/ironyh/VueSIP/commit/00b75814a2bb45bab8b48a9dee38aa5789ded872))
* **constants:** align NETWORK_QUALITY_LEVELS with NetworkQualityLevel type ([eb56364](https://github.com/ironyh/VueSIP/commit/eb56364a520f5a9160f5da9b871046b3c8bd684c))
* **constants:** make WEBSOCKET_URL_REGEX case-insensitive ([9405eac](https://github.com/ironyh/VueSIP/commit/9405eacb99223dafda11401ad3a7e0cccb11dbe9))
* **core:** make SIP URI validation case-insensitive ([5e0debb](https://github.com/ironyh/VueSIP/commit/5e0debb66a00c499b49eb367d9a6cf6f4636dde0))
* **coverage:** switch to istanbul provider to generate coverage-summary.json ([496296b](https://github.com/ironyh/VueSIP/commit/496296bf5d1e1848156d7f2b852987616c2b8ef5))
* **credentialStorage:** validate schema on load to reject tampered storage data ([f74a2e9](https://github.com/ironyh/VueSIP/commit/f74a2e9edf82da12c79d4fe42c561349e1a6334c))
* define missing types locally in qualityReport.ts ([2272031](https://github.com/ironyh/VueSIP/commit/2272031482c3bc16cef34246e71e6ad76390779a))
* **demo-health:** add custom domain config for IVR Tester Cloudflare Pages ([fee6f87](https://github.com/ironyh/VueSIP/commit/fee6f8722c7d48ec580c8ecc105bdc11117d2e4a))
* **demo-health:** add issues:write permission for GitHub API calls ([#186](https://github.com/ironyh/VueSIP/issues/186)) ([e984ef9](https://github.com/ironyh/VueSIP/commit/e984ef9677b8e1f20f4f89672dd8f674eb8c97f6))
* **demo-health:** add issues:write permission to allow GitHub API calls ([4882afe](https://github.com/ironyh/VueSIP/commit/4882afe0c1d91a584e7ba3587284140f331665b3))
* **demo-health:** remove IVR Tester from health check (not yet deployed) ([9b34480](https://github.com/ironyh/VueSIP/commit/9b344808d16b27c88a99de7704c4d1b68b47684f))
* **deps:** update flatted to 3.4.2 (CVE fix) ([2d682a9](https://github.com/ironyh/VueSIP/commit/2d682a99464d6d93089e1e36fb1056fd57ad6d58))
* **diagnostics:** add missing TerminationCause mappings ([bb0f367](https://github.com/ironyh/VueSIP/commit/bb0f367b37df59824c34ba846ead39c55bab949d))
* **diagnostics:** add null/undefined checks to getCallDiagnostics ([8f4df62](https://github.com/ironyh/VueSIP/commit/8f4df624867154aba55d59b2ed52bbd01743ce2a))
* **diagnostics:** handle empty cause values gracefully ([2bd4f27](https://github.com/ironyh/VueSIP/commit/2bd4f27992d364994e8a3b17159d204901b505cc))
* **e2e:** increase job timeouts to prevent test cancellations ([#202](https://github.com/ironyh/VueSIP/issues/202)) ([9d11593](https://github.com/ironyh/VueSIP/commit/9d115938eb286451b2c6cde89a58aed861dee9df))
* **elks:** handle Unicode characters in Basic Auth credentials ([aca6b39](https://github.com/ironyh/VueSIP/commit/aca6b391685262a92398dff7132a8d5815551ceb))
* **encryption:** handle Map/Set in sanitizeForLogs; lowercase ALWAYS_MASK_FIELDS keys ([842b2a4](https://github.com/ironyh/VueSIP/commit/842b2a497289954d508d554e943e442e1b353a00))
* **encryption:** reject undefined data with clear error message ([a1f2f31](https://github.com/ironyh/VueSIP/commit/a1f2f31713df40f8f267d526d1beda973909abb2))
* **encryption:** remove duplicate 'apiKey' entry from ALWAYS_MASK_FIELDS ([ea76dff](https://github.com/ironyh/VueSIP/commit/ea76dff9b718c1d9b445bcc779e21dcf2fdc3994))
* **encryption:** resolve 8 TypeCheckErrors in WebCrypto BufferSource types ([b80ae92](https://github.com/ironyh/VueSIP/commit/b80ae92975dbbac34f2cd3de7d27e61dbcc9bd71))
* **encryption:** resolve 8 TypeCheckErrors in WebCrypto BufferSource types ([#188](https://github.com/ironyh/VueSIP/issues/188)) ([31ca253](https://github.com/ironyh/VueSIP/commit/31ca253f29bab7e2622f53ec743a6b67877c9b6c))
* **env.test:** replace 'any' type with Record&lt;string, unknown&gt; to eliminate lint warnings ([ba9d2c4](https://github.com/ironyh/VueSIP/commit/ba9d2c4a5d0036693812a2c09047865e7dd589f2))
* **env:** add process.env.NODE_ENV fallback to isProductionMode() ([1ba8b1d](https://github.com/ironyh/VueSIP/commit/1ba8b1d374fa0bea3f1ec404e1d4d8c197a909f1))
* **env:** improve isSecureContext with fallback for older browsers ([df032ef](https://github.com/ironyh/VueSIP/commit/df032ef07b42337523f90011d080a409acf1fd11))
* ESLint indentation in ClickToCallWidgetDemo.vue ([3726975](https://github.com/ironyh/VueSIP/commit/37269754a2c923f9ec4eee7fd953df23fe68b972))
* export useSettingsPersistence composable ([cabd069](https://github.com/ironyh/VueSIP/commit/cabd0693c8b242f03f9881a65ea5a6c55cff7180))
* **exports:** add missing composable and type exports ([8897d00](https://github.com/ironyh/VueSIP/commit/8897d00c70e30165a59b612a8af1367326fe29d2))
* **exports:** add missing Return type exports ([579f765](https://github.com/ironyh/VueSIP/commit/579f765b903f1cb29b53163fc4d858a24f7269e2))
* **exports:** add missing UseAudioDevicesReturn type export ([49d6ceb](https://github.com/ironyh/VueSIP/commit/49d6cebbb904bb8032fd200e86832f10fca3d0d4))
* **exports:** add missing UseCallHoldReturn type export ([98b60d2](https://github.com/ironyh/VueSIP/commit/98b60d28b4c14273f5eeb31bf014963bdf68ca0d))
* **exports:** add missing UseCallTransferReturn type export ([4596232](https://github.com/ironyh/VueSIP/commit/45962320b964ce0689167b318d1187b08da3ada7))
* **formatCallDirection:** always return title case for unknown directions ([7c7ff28](https://github.com/ironyh/VueSIP/commit/7c7ff282ceb71b365c389da7b3bd917467f52c24))
* **formatCallDirection:** always return title case regardless of input case ([a9aa4f1](https://github.com/ironyh/VueSIP/commit/a9aa4f1678342841db9ae4d51da74c9005572f8c))
* **formatCallTime:** handle future dates properly ([a3cca79](https://github.com/ironyh/VueSIP/commit/a3cca79d0d38f892483cd14613d93952b8b67e87))
* **formatters:** add country-specific phone formatting tests and fix bugs ([78cb4f7](https://github.com/ironyh/VueSIP/commit/78cb4f76f314248109e67a75d45fb051f20988a2))
* **formatters:** add NaN handling to formatSipStatusCode ([b8f13fc](https://github.com/ironyh/VueSIP/commit/b8f13fc2e88af3501f84daa5994a35ae93f9a952))
* **formatters:** add NaN/Infinity handling to truncate ([812d00e](https://github.com/ironyh/VueSIP/commit/812d00ebf3ebe9f8fd23e63c4fe7900d5bdac696))
* **formatters:** add null/undefined handling to formatCallDirection ([f6f1149](https://github.com/ironyh/VueSIP/commit/f6f114934362dc910fa0f6ecb3ad15fc61116026))
* **formatters:** add null/undefined handling to formatCallStatus ([30db867](https://github.com/ironyh/VueSIP/commit/30db867c049046b106028bab20c1c43b431e35e9))
* **formatters:** add null/undefined handling to formatSipStatusCode ([bd8afb0](https://github.com/ironyh/VueSIP/commit/bd8afb0a923d954b65e9ff6bdf78cd5bd9745493))
* **formatters:** add null/undefined handling to normalizePhoneNumber ([99e1187](https://github.com/ironyh/VueSIP/commit/99e118797115cb8bbc54bebe4f8407989d60ae00))
* **formatters:** add Swedish 74x/79x mobile prefixes to phone formatter ([621a40d](https://github.com/ironyh/VueSIP/commit/621a40d2bef833e82a321ea005e470d1980acd19))
* **formatters:** clamp now swaps bounds when min &gt; max ([24ef6b4](https://github.com/ironyh/VueSIP/commit/24ef6b4ca335deb6796c56d5fb1b2c55d4c2ba9e))
* **formatters:** correct clamp() behavior when min &gt; max ([1e22247](https://github.com/ironyh/VueSIP/commit/1e2224727e761f264515ad6babf06de6a8488880))
* **formatters:** correct Finland phone number formatter (+358) ([ebcebd7](https://github.com/ironyh/VueSIP/commit/ebcebd74051874096f36ad8aa1a730ee93c3be67))
* **formatters:** correct German (+49) phone number format ([a38517a](https://github.com/ironyh/VueSIP/commit/a38517a59c86a8e855fe27f1f9f9a9892b949d4a))
* **formatters:** correct phone formatter slice indices for France and Norway ([ad94092](https://github.com/ironyh/VueSIP/commit/ad940921dad98f234b6bda91aa80b046d9055c2c))
* **formatters:** correct stale Finland phone test expectation ([857e374](https://github.com/ironyh/VueSIP/commit/857e3744e826ba70f45903f013fe1225d0df0137))
* **formatters:** handle edge case in truncate when maxLength &lt; ellipsis ([7f7f735](https://github.com/ironyh/VueSIP/commit/7f7f735989f7e20755d2a0e6c47e1f33e03dec61))
* **formatters:** handle min &gt; max edge case in clamp() ([02f9c84](https://github.com/ironyh/VueSIP/commit/02f9c84eb53dd32e10544339598d4bdc6a17385e))
* **formatters:** preserve case style in formatCallDirection ([dcdb59f](https://github.com/ironyh/VueSIP/commit/dcdb59f40437e5151d27ac0d6864e5994fe82cee))
* improve type safety in ConnectionTestButton ([689a76f](https://github.com/ironyh/VueSIP/commit/689a76f2f0c56923ad194db9eded3be89d2ec81e))
* **index:** export errorHelpers utilities at top level ([7192996](https://github.com/ironyh/VueSIP/commit/71929964585499f34b0331d19d0db4308d602483))
* **lint:** disable non-null assertion warning in useConnectionHealthBar test ([0f08b64](https://github.com/ironyh/VueSIP/commit/0f08b6449c43384a3e9d94d8c5c8e212ddab9a87))
* **lint:** remove @typescript-eslint/no-explicit-any warnings in useCallRecording.test.ts ([5db3e4b](https://github.com/ironyh/VueSIP/commit/5db3e4b33c9d81905cd1033a048e124b9a54ec17))
* **lint:** remove unused computed import in useCallQualityRecorder ([cdd21e7](https://github.com/ironyh/VueSIP/commit/cdd21e7d51241cbb4a61b3f1ed537b9654c477ca))
* **lint:** replace 'any' type casts with proper unknown types ([9a5a621](https://github.com/ironyh/VueSIP/commit/9a5a6210584e96199305d63952ff792a0e80236f))
* **lint:** replace any type with undefined in test type declaration ([c87d862](https://github.com/ironyh/VueSIP/commit/c87d86249b24c3c532d2927556ecfc44bf796517))
* **lint:** suppress explicit-any warnings in test files ([fc0870a](https://github.com/ironyh/VueSIP/commit/fc0870a1bf7cc7772e34bb96133492e5b3b47aca))
* make SIP_URI_REGEX case-insensitive ([30f8bb7](https://github.com/ironyh/VueSIP/commit/30f8bb7cc79d94faed84ffa557646dcd0d50cf2e))
* **performance:** bump MAX_BUNDLE_SIZE to 800KB ([e547f27](https://github.com/ironyh/VueSIP/commit/e547f2712befd949efcaca00140fde1fa89d15ed))
* **pwa-softphone:** add missing currentAccountConfigForQr computed prop ([2160cf0](https://github.com/ironyh/VueSIP/commit/2160cf0c0edfbce55eda67c634308f0fd773a48c))
* **pwa-softphone:** resolve build errors and add missing dependencies ([f5e3a5c](https://github.com/ironyh/VueSIP/commit/f5e3a5c90d6a4ac32d07af133da2b36cfe759d2a))
* **pwa-softphone:** resolve type issues in usePhone.ts media device handling ([22fc358](https://github.com/ironyh/VueSIP/commit/22fc3589cb5a9a664508358bf8e0f8501ba796bd))
* **pwa-softphone:** use props.accountConfig instead of undefined newConfig in QrProvisioning ([c5744ed](https://github.com/ironyh/VueSIP/commit/c5744ed3e15a0682591314e7bc992f087001098e))
* **quality:** remove unused imports and replace non-null assertions with type guards ([582c4d4](https://github.com/ironyh/VueSIP/commit/582c4d423ed880b0b1837d1329a496b3218ce07d))
* **qualityReport:** correct MOS calculation for packet loss ([b17d4b6](https://github.com/ironyh/VueSIP/commit/b17d4b6dddfc9f053e510f25daaa45fd3cb848e5))
* **qualityReport:** correct MOS formula coefficient from 7e-5 to 7e-6 ([7cea780](https://github.com/ironyh/VueSIP/commit/7cea780c738213b1ab34b94610aa8676be89538a))
* remove redundant env exports from utils/index.ts ([09be2c6](https://github.com/ironyh/VueSIP/commit/09be2c68792e99cf7bead76c4085e6d4fac8d35e))
* remove unnecessary 'as any' cast in useCredentialExpiry test ([cc17a18](https://github.com/ironyh/VueSIP/commit/cc17a186154934333063b8c1102456fe20af0473))
* remove unused imports in useMediaPermissions.test ([3454f8c](https://github.com/ironyh/VueSIP/commit/3454f8c69d4aa854c28425f622106a988d54d125))
* resolve @typescript-eslint/no-explicit-any warnings in sipUri.test.ts ([f4ce9bc](https://github.com/ironyh/VueSIP/commit/f4ce9bcb7691185e42471daf3949beec52af8d35))
* resolve duplicate TypeScript exports for QualityTrend and HistoryFilter ([5c1e31e](https://github.com/ironyh/VueSIP/commit/5c1e31ed5fd5394376eeae146bf06dff31d0c4cb))
* resolve lint errors - unused vars in test, remove unused reset in ConfirmDialog ([5ba516a](https://github.com/ironyh/VueSIP/commit/5ba516a66dc9539d2b0bb16e109929f18c028a2e))
* resolve lint warnings in callDiagnostics ([60ddeda](https://github.com/ironyh/VueSIP/commit/60ddeda7810a8c6f3cfc363f26cc7c2439ef3fad))
* resolve retry logic bug in useAmiCallback and add unit tests ([#204](https://github.com/ironyh/VueSIP/issues/204)) ([012e88f](https://github.com/ironyh/VueSIP/commit/012e88f96f31d85f5ed61e10eed3b95b373b1851))
* resolve TypeScript readonly array errors and lint warning ([0a025f3](https://github.com/ironyh/VueSIP/commit/0a025f3604ccfedb30c5332ac2423dd8f184df78))
* resolve useCallQualityHistory test throttling issue ([cb5aa18](https://github.com/ironyh/VueSIP/commit/cb5aa18b5d22c4d161ad405c28925bfabd736efb))
* security vulnerabilities (undici + yauzl) ([ab8751f](https://github.com/ironyh/VueSIP/commit/ab8751f54bff0399e72f78bf2c114bb5c7ed821e))
* **test:** eliminate non-null assertions in sipUri tests ([87ac7c3](https://github.com/ironyh/VueSIP/commit/87ac7c3f6006ccde3d9d4bb9c795d35764dc4284))
* **test:** enable TypeScript type-checking in vitest ([3b36a0d](https://github.com/ironyh/VueSIP/commit/3b36a0db8cd72473561ecc9369d7257cf8f1e5fd))
* **testing:** waitForValue generates descriptive error messages on timeout ([a979d8d](https://github.com/ironyh/VueSIP/commit/a979d8d09277c70e6d8a49944b2eee15c49a3526))
* **test:** migrate vitest poolOptions to top-level config (Vitest 4+) ([b39eb59](https://github.com/ironyh/VueSIP/commit/b39eb59eb1895822ede10eec4e72dc88063f272e))
* **test:** relax event listener scaling threshold for CI environments ([58b211c](https://github.com/ironyh/VueSIP/commit/58b211c98754b506f89daaf56b94a03af7b89deb))
* **test:** remove any type cast in useMediaPermissions test ([074a9a1](https://github.com/ironyh/VueSIP/commit/074a9a19ae27557e748e83aa2706ce0a51cd6ab2))
* **test:** remove any type casts in useTranscription tests ([a991040](https://github.com/ironyh/VueSIP/commit/a991040c5a0036d57eafc760fdf8e8f30869bd51))
* **test:** remove duplicate iceConnectionState property in mock RTCPeerConnection ([9306644](https://github.com/ironyh/VueSIP/commit/9306644d9976f76173991739079cd21c046c6b0f))
* **test:** remove incorrect lastUpdated assertion in useCallQualityStats test ([75a2231](https://github.com/ironyh/VueSIP/commit/75a2231b6ee3434cdbf8f9d67adafc1871929333))
* **test:** remove non-null assertions in useAmiBase.test.ts ([e8230b2](https://github.com/ironyh/VueSIP/commit/e8230b232843b65ecf5434f858387c0cece1d99e))
* **test:** remove non-null assertions in useCallQualityScore tests ([80d1544](https://github.com/ironyh/VueSIP/commit/80d154451ee4f0eb313b452cb87db1e9bd302893))
* **test:** replace 'any' type casts with proper TestMockProvider type ([66da618](https://github.com/ironyh/VueSIP/commit/66da6189622d3225e24b4d6de586aaaece2fd824))
* **test:** replace 'as any' with proper type cast in usePresence test ([5c06edf](https://github.com/ironyh/VueSIP/commit/5c06edf143512f611615e3ebd93997a53baf86d5))
* **test:** replace any with unknown in mock RTCSession ([ae31613](https://github.com/ironyh/VueSIP/commit/ae31613f34451160f193a0d4b658276dd725e12e))
* **test:** replace explicit any with DTMFEvent type ([77ba56c](https://github.com/ironyh/VueSIP/commit/77ba56c67a48974dcfe2a519bc928c1cd37b1201))
* **test:** replace non-null assertions with optional chaining in voipms tests ([b0e85b7](https://github.com/ironyh/VueSIP/commit/b0e85b7073c63a2b2abcd02239e4c4c6c331b995))
* **test:** replace non-null assertions with type-safe helper in useMultiSipClient ([2127bc6](https://github.com/ironyh/VueSIP/commit/2127bc61a003d8f8042fb34c5236c49429bba8f0))
* **test:** replace unsafe 'any' casts with proper types in useDialStrategy tests ([e93fd48](https://github.com/ironyh/VueSIP/commit/e93fd487290426c7da38a1bdfb9eac507a0d067e))
* **test:** resolve TypeScript any lint warnings in useConnectionTest.test.ts ([d972bcf](https://github.com/ironyh/VueSIP/commit/d972bcfc8185b854c44253ca2ff91ce1461e8fbc))
* **tests:** add missing .value for ref comparisons in useMediaPermissions tests ([334a4b7](https://github.com/ironyh/VueSIP/commit/334a4b7f86a2138cc06e3efe88ae00f34bb2c5b6))
* **tests:** improve MediaManager ICE logging test mock factory ([2bc676b](https://github.com/ironyh/VueSIP/commit/2bc676b7b67146b29b241d953f170b7ec8d954c7))
* **test:** update clamp() test to match swapped bounds behavior ([3037605](https://github.com/ironyh/VueSIP/commit/30376059c6545bf18aa3d95e6bf144101ca0af9c))
* **test:** use Vue refs in ConfirmDialog test mock ([e52f057](https://github.com/ironyh/VueSIP/commit/e52f057a1fba8c9ab5f66c174884983508d31470))
* **types:** remove any type casts in useGracefulDegradation tests ([5dc5b08](https://github.com/ironyh/VueSIP/commit/5dc5b08b3fe09f377118cc5f3ebf5f5d4170aabf))
* **types:** replace any casts with proper types in useGracefulDegradation tests ([41589fa](https://github.com/ironyh/VueSIP/commit/41589fac0b2d9343e25d2c8e7d28cdb19bb5c1a8))
* **types:** resolve TypeScript strict null checks in callQualityHistory ([682078e](https://github.com/ironyh/VueSIP/commit/682078e633da9c925c39f5898bc93db8dad37b76))
* update pnpm-lock.yaml to resolve ERR_PNPM_LOCKFILE_CONFIG_MISMATCH ([bdf2303](https://github.com/ironyh/VueSIP/commit/bdf2303359b23b263f6f0a4e36d695e91da813b9))
* **use46ElksApi:** remove duplicate lines in clear() and add unit tests ([b5a04d5](https://github.com/ironyh/VueSIP/commit/b5a04d5fe3adc3c8587ab57b57b5dac3e80c948a))
* **useAmiCDR:** resolve 2 TypeCheckErrors (operator precedence) ([7e21d7c](https://github.com/ironyh/VueSIP/commit/7e21d7ca10e547a4a95002ec1b66517038467f7d))
* **useAmiCDR:** use ?? fallback for indexed access to satisfy noUncheckedIndexedAccess ([2e8f4fe](https://github.com/ironyh/VueSIP/commit/2e8f4fe0942bae94be8b9b5a775ee31499be6866))
* **useAmiCDR:** use explicit conditional instead of optional chaining in array index ([b6c8ced](https://github.com/ironyh/VueSIP/commit/b6c8ced038af199dc7ede517f45e13b9f9d9704a))
* **useAmiCDR:** use explicit if-branching for type narrowing ([ef510c2](https://github.com/ironyh/VueSIP/commit/ef510c25fe27db6070667fc692e54570fe71ed6f))
* **useAmiCDR:** use instanceof Date guard for explicit type narrowing ([e28e77c](https://github.com/ironyh/VueSIP/commit/e28e77c6f5f83713b66ec80f7ce223d9641c5658))
* **useCallQualityHistory:** replace non-null assertions with type casts ([8fcc655](https://github.com/ironyh/VueSIP/commit/8fcc6551403eb42d1df9a62a51c89fb22a5be47f))
* **useCallQualityStats:** replace any with DtmfSessionSource type ([25405ce](https://github.com/ironyh/VueSIP/commit/25405ce33731b7fe2f32b72ac0d8046ed7902b6c))
* **useCallQualityStats:** resolve TypeScript narrowing issues in stats collection ([ab5bd47](https://github.com/ironyh/VueSIP/commit/ab5bd47e70fe5493e1f883c8cf6437dc37d8f51f))
* **useConnectionTest:** change hardcoded Swedish strings to English ([25b8810](https://github.com/ironyh/VueSIP/commit/25b881030ec8405aeb7e0209f832ef5d10512a55))
* **useConnectionTest:** remove redundant dynamic import ([4a92907](https://github.com/ironyh/VueSIP/commit/4a929070cb28ec96949d96eb0009ac3cc88bac4e))
* **useGalleryLayout:** remove rows cap to prevent overflow for 17-24 participants ([86111e9](https://github.com/ironyh/VueSIP/commit/86111e9f9dbac18e22e3f910e58b6700067d0750))
* **useMessaging test:** replace any[] with MessagingEvent[] type annotations ([75e51da](https://github.com/ironyh/VueSIP/commit/75e51daa55052de9ece23380bef89e17a88f88b3))
* **usePushNotifications:** improve type safety with extended options and proper NotificationOptions cast ([0234118](https://github.com/ironyh/VueSIP/commit/02341184839722c7ea3242d87e71b7dbe2263076))
* **usePushNotifications:** replace any types with proper Service Worker types ([b6cfe70](https://github.com/ironyh/VueSIP/commit/b6cfe70daccfb150f5bb47738adbe0e22262e9b9))
* **useQualityAlerts:** add missing computed import ([054317f](https://github.com/ironyh/VueSIP/commit/054317f4cd919e627507ec2ccefff28d788d8b60))
* **useSentiment:** handle edge case when min &gt; max in clamp() ([2f9fa8b](https://github.com/ironyh/VueSIP/commit/2f9fa8bcd0043496fd004e8db5cd10da5f511b3a))
* **useTheme:** add SSR/non-browser environment guards ([670224a](https://github.com/ironyh/VueSIP/commit/670224aa7f5449a7987b2c0dd081d9f12a8fb731))
* **utils:** export missing callQualityHistory utilities ([f550783](https://github.com/ironyh/VueSIP/commit/f550783b1a8fc40b147fbc5c495457d217e44aed))
* **validators:** add missing isValid field to validatePhoneNumber ([5e8c60e](https://github.com/ironyh/VueSIP/commit/5e8c60ea55aa4cdc99c2ff528830a6d3ffea5843))
* **validators:** handle URLs without hostname in validateUrl ([f6ecb91](https://github.com/ironyh/VueSIP/commit/f6ecb91f428531fb9adaf717df89fb4d1a5d1375))
* **validators:** improve URL hostname validation error message ([accb0bd](https://github.com/ironyh/VueSIP/commit/accb0bde3cc1a0452088fe4195703db28e8d762b))
* **validators:** replace process.env.NODE_ENV with isProductionMode() ([d53f127](https://github.com/ironyh/VueSIP/commit/d53f1278ff43c00541129cb1e20c0e3510a4885d))
* **webrtc:** default STUN servers when rtcConfiguration not provided ([5a6f142](https://github.com/ironyh/VueSIP/commit/5a6f142a9c3cee82e0cc65778b51fbb9b686a3bc))


### Performance Improvements

* optimize breakoutAllCallers with concurrent requests ([3381ed4](https://github.com/ironyh/VueSIP/commit/3381ed4d58cc0509e30ad38c689884dfa5de29b7))
* optimize call history statistics calculation ([47da5b8](https://github.com/ironyh/VueSIP/commit/47da5b85af248f411f08e949c085279d4b28f143))
* use Map for efficient queue lookups in useAmiAgentLogin ([2f1c0db](https://github.com/ironyh/VueSIP/commit/2f1c0db07749c32832d4a4e4129b81c2cfb4babe))

## [1.1.0](https://github.com/ironyh/VueSIP/compare/v1.0.0...v1.1.0) (2026-03-28)


### Features

* add ConnectionTestButton to PWA softphone header ([a07027a](https://github.com/ironyh/VueSIP/commit/a07027adb14acf651c12675a69eb358a42a9fae2))
* add isWebRtcError helper for WebRTC error detection ([628e0b8](https://github.com/ironyh/VueSIP/commit/628e0b8ea20b9e1e3ae527135defddd71ac22c64))
* add unit tests for useSuggester composable ([ab071aa](https://github.com/ironyh/VueSIP/commit/ab071aaa91b7fe989c3fb3bd9fd8d626b77794dc))
* Add useCallRecording composable for WebRTC call recording ([0bee3d1](https://github.com/ironyh/VueSIP/commit/0bee3d1eba50f8af46ee406af84330d99361d366))
* add usePushNotifications PWA composable ([076fab2](https://github.com/ironyh/VueSIP/commit/076fab2fb99989f8c813d78391ef3f6dc874cb93))
* **api:** export constants from main entry point ([da30303](https://github.com/ironyh/VueSIP/commit/da30303c4c0cefd7f27a16d5f5195f7c8c2deb6d))
* **CallSession:** add last error diagnostics properties ([3726975](https://github.com/ironyh/VueSIP/commit/37269754a2c923f9ec4eee7fd953df23fe68b972))
* **ci:** add npm audit security automation workflow ([39cccb3](https://github.com/ironyh/VueSIP/commit/39cccb354fe9f8d0049f5d38bfea8a553b032031))
* **composables:** add useConnectionTest for pre-call diagnostics ([442d074](https://github.com/ironyh/VueSIP/commit/442d0747ba3d0e5ec3c63900229c720df0c525f4))
* **composables:** export useCallQualityStats ([b687c21](https://github.com/ironyh/VueSIP/commit/b687c21307ef2567df99bd272f50570c2135c49b))
* **composables:** improve useMediaDevices error messages with codes and guidance ([f649be1](https://github.com/ironyh/VueSIP/commit/f649be198720d16fcba6ad7b9b91b93dd33a88f9))
* **constants:** add network quality levels and thresholds ([20fc95f](https://github.com/ironyh/VueSIP/commit/20fc95f5634ae94482fddd7ce898e5c7cbab6306))
* **demos:** add automated health monitoring ([734a55b](https://github.com/ironyh/VueSIP/commit/734a55bb9dcc9b18639ea7716c08838ea284ad8d))
* **encryption:** add sanitizeForLogs utility for safe logging ([eaf3417](https://github.com/ironyh/VueSIP/commit/eaf3417d6863cf0ebf3dbf084a9ce2e2638127ac))
* **env:** add browser and OS detection utilities ([1b7ac6e](https://github.com/ironyh/VueSIP/commit/1b7ac6e72e3bbfbfc48f151e411d6cac7b8bad8d))
* **env:** add isBrowser() utility for environment detection ([40948c6](https://github.com/ironyh/VueSIP/commit/40948c618b1a866a3dde26163471591f1a2e017c))
* **env:** add isIframe utility for embed detection ([1688e1c](https://github.com/ironyh/VueSIP/commit/1688e1c1de1569c1a3941e582cf0fc8ad3f678bb))
* **env:** add isMobileDevice() utility for mobile browser detection ([ea55ab9](https://github.com/ironyh/VueSIP/commit/ea55ab9c22cc8214d8b3d449502531d15b321c3a))
* **env:** add isSecureContext for WebRTC requirement detection ([a595cb9](https://github.com/ironyh/VueSIP/commit/a595cb948cf433a83f40fc7120e226f30662247a))
* **env:** add isWebRTCSupported utility function ([c8ea224](https://github.com/ironyh/VueSIP/commit/c8ea2240c9e2621ea25aa7fb1a91672d43bdf6f5))
* **errorHelpers:** add DOMException type guards ([66bbb4d](https://github.com/ironyh/VueSIP/commit/66bbb4d30ce7fc989fb39a0f5e1dd80d84984f91))
* **errorHelpers:** add isRangeError, isSyntaxError, isReferenceError type guards ([ccc9ab1](https://github.com/ironyh/VueSIP/commit/ccc9ab1539765946518ad1da205a67dfc78cb193))
* **errorHelpers:** add isSipStatusCodeError type guard for SIP error detection ([add70d1](https://github.com/ironyh/VueSIP/commit/add70d19a9dfa4f81da33cb42dc4ad4409613930))
* **errorHelpers:** add isTimeoutError type guard ([f3786bd](https://github.com/ironyh/VueSIP/commit/f3786bd2cca77dea1ee416ed9afd205c856eccd8))
* **EventEmitter:** add getHandlers method for testing and debugging ([9513f61](https://github.com/ironyh/VueSIP/commit/9513f6197e6b0d83041eeb8d51dee795b2f665c1))
* **EventEmitter:** add hasListener method for checking specific handlers ([01322de](https://github.com/ironyh/VueSIP/commit/01322de6f8f8deecd097e19bb0e5dc830d6c3ae4))
* export quality report utilities from main API ([4085ec8](https://github.com/ironyh/VueSIP/commit/4085ec8d1084f4100b9d640b12858ba954f3f00d))
* **exports:** add missing 46elks API service exports ([d85e2a9](https://github.com/ironyh/VueSIP/commit/d85e2a93b84edad35121ab41024e8c34aa192c1f))
* **formatters:** add clamp utility function ([6b23477](https://github.com/ironyh/VueSIP/commit/6b23477e8bf65a242a0a23b5706531d7921c0885))
* **formatters:** add formatMilliseconds utility for WebRTC stats ([f728610](https://github.com/ironyh/VueSIP/commit/f7286104f4253d6d889de0bf0cc7b9e8b560e0c1))
* **formatters:** add formatSipStatusCode for human-readable SIP status messages ([7792fd4](https://github.com/ironyh/VueSIP/commit/7792fd4483a23baa1c3c4932d3808b900197770b))
* **formatters:** add multi-country phone number formatting support ([15e853f](https://github.com/ironyh/VueSIP/commit/15e853f1b2bd8e4a515620d2ba67e0a5ac6e231e))
* **formatters:** add parseQueryString utility function ([7dd652d](https://github.com/ironyh/VueSIP/commit/7dd652d2975daf8200b3d58d055f4dc8c9dfafa4))
* improve coverage diff workflow, raise bundle thresholds, add CRM/TransportManager tests ([75e93e9](https://github.com/ironyh/VueSIP/commit/75e93e938f2feb90891b2c1cec6d29ebb01fc715))
* **index:** export IceConnectionState and IceGatheringState types ([91fa324](https://github.com/ironyh/VueSIP/commit/91fa32477d25a955b254351382676d444e29d20e))
* **mediamanager:** ICE connection state transition logging with correlation IDs ([1f4aa4a](https://github.com/ironyh/VueSIP/commit/1f4aa4ab624c34c32d9d394b0e2d85bbd409ca90))
* **overlay:** add CallFailureOverlay component for call diagnostics ([329842f](https://github.com/ironyh/VueSIP/commit/329842fe887f9a6d08d19f58668a1b53f0f26365))
* **pwa-softphone:** add QR provisioning settings tab ([062400c](https://github.com/ironyh/VueSIP/commit/062400c93b1d4d19b9ee96e98a1b4d2ba2ce1ded))
* **pwa-softphone:** add record button and controls to CallScreen ([5c54652](https://github.com/ironyh/VueSIP/commit/5c5465219de1d1001193b53cbdb9dd47c97ea526))
* **pwa-softphone:** wire DiagnosticsPanel to real-time SipClient data (Phase 1) ([f7ed0ad](https://github.com/ironyh/VueSIP/commit/f7ed0ad3e13b1f14f38ac60d021a450abfed1bb5))
* **pwa:** add early media permission check to reduce first-call friction ([90be920](https://github.com/ironyh/VueSIP/commit/90be92066de9b2ae9ea9d97ddb81cd4323c8a1b5))
* **recording:** auto-start recording when persistence enabled and call becomes active ([8a76c6b](https://github.com/ironyh/VueSIP/commit/8a76c6bed86391950a105f7a58dfe3490ad097f4))
* **scripts:** add health monitoring cron script ([165c8ac](https://github.com/ironyh/VueSIP/commit/165c8ac3fe44d1378e919eb607adbf782ccb2e53))
* **suggester:** add triageQuestionBank as shared TypeScript utility ([f7039ba](https://github.com/ironyh/VueSIP/commit/f7039ba65f20dfc88165e426787f4bd062c491ab))
* **suggester:** add useSuggester composable + SuggesterChip/SuggesterPanel components ([08d821e](https://github.com/ironyh/VueSIP/commit/08d821e090449424103c4e4d346af3eb76f1c89d))
* **template:** add call recording to CallScreen ([a911b2f](https://github.com/ironyh/VueSIP/commit/a911b2fb29f11f7a043f8357ddb25ca35bb67947))
* **testing:** add createDeferred utility and tests ([53f7f1d](https://github.com/ironyh/VueSIP/commit/53f7f1d10d27f55e208e47d5d08ee4096b9f82b8))
* **testing:** add waitFor async condition utilities ([ba91480](https://github.com/ironyh/VueSIP/commit/ba914809967935e2d997df127d195393a7e0d445))
* **testing:** export waitFor utilities from main index ([465d217](https://github.com/ironyh/VueSIP/commit/465d217dcb8217bb15922ae23af8b114d81a6773))
* **utils:** add extended SIP URI parsing utilities ([e882528](https://github.com/ironyh/VueSIP/commit/e88252801eed53aebe4f0b93503a637a2b5bac3e))
* **utils:** add isDevelopmentMode() environment utility ([bd0d023](https://github.com/ironyh/VueSIP/commit/bd0d0235cd56eda0aa1521d6d254c5e405f68b11))
* **utils:** add isNetworkError helper for error handling ([5fdfe7c](https://github.com/ironyh/VueSIP/commit/5fdfe7c3def3ba0554c5424fc741646cae1598dd))
* **utils:** add isProductionMode() environment utility ([81e2142](https://github.com/ironyh/VueSIP/commit/81e21425541dc898c0e47b314b84501241c65164))
* **utils:** add PWA and service worker detection utilities ([7ef7bc9](https://github.com/ironyh/VueSIP/commit/7ef7bc9dd255c10bbfe18006397c67e64391c3ee))
* **utils:** add runtime input validation for callDiagnostics suggestions ([fbd7590](https://github.com/ironyh/VueSIP/commit/fbd7590b4fa448d5b3afef6156e15c8311bd6008))
* **utils:** add SIP/WebRTC error helpers for reliability ([c79597a](https://github.com/ironyh/VueSIP/commit/c79597a94dd082b002e4c21cf334e82e62894bcf))
* **utils:** export callDiagnostics utilities from main index ([7bf54c9](https://github.com/ironyh/VueSIP/commit/7bf54c95be3898c92cc9d65f61f9b45a1e1facce))
* **utils:** export qualityReport utilities from index ([7c2574d](https://github.com/ironyh/VueSIP/commit/7c2574d054472958db8359b2b13e7595b624003d))
* **utils:** export SimpleValidationResult type ([31e7269](https://github.com/ironyh/VueSIP/commit/31e72696970fd05806f99515ea5ce372b4f82a68))
* **validators:** add validateUrl utility for general URL validation ([2dcfcce](https://github.com/ironyh/VueSIP/commit/2dcfcce9a10f6bad0b374c518ae122e5a7ff4e59))


### Bug Fixes

* add missing Vue type imports in useMediaPermissions ([bbb1cd8](https://github.com/ironyh/VueSIP/commit/bbb1cd8a72959a69b4c8cdb5c36248bc5097bec5))
* add picomatch override to resolve security audit failure ([7ecc0cb](https://github.com/ironyh/VueSIP/commit/7ecc0cb52c42a2651adbc93b41f1881b9092f546))
* **amiservice:** fix auto-reconnect memory leak and broken reconnect handler ([6ff390f](https://github.com/ironyh/VueSIP/commit/6ff390f160d1bcafefd531f4295ba540fe201799))
* apply rtcConfiguration to incoming call answers (ICE candidates) ([2c13433](https://github.com/ironyh/VueSIP/commit/2c13433245f40c1327c54a7c19ddfb12b1ec6354))
* **bundle-size:** correct thresholds — was always failing (~2500KB vs 500KB limit) ([692bf2c](https://github.com/ironyh/VueSIP/commit/692bf2c901f77f83e8dd9e376f079097e4187f11))
* **CallScreen:** add missing pauseRecording and resumeRecording imports ([e5e3995](https://github.com/ironyh/VueSIP/commit/e5e39956ca006cc5455a72a0dbfc894368c782f6))
* **cdr:** resolve 3 TypeCheckErrors in performance tests ([0e6d054](https://github.com/ironyh/VueSIP/commit/0e6d0549f602da9f19beb97a6772c88b02c2256d))
* **ci:** add checkout step to PR Staleness Monitor workflow ([2447277](https://github.com/ironyh/VueSIP/commit/2447277352ccc9817a92c7fe76dfe07f8e8157dc))
* **ci:** add checkout step to Release workflow to fix commit creation error ([7b4fd04](https://github.com/ironyh/VueSIP/commit/7b4fd04043e20d8755670590cc94d8bc4f7f1ebe))
* **ci:** align pnpm/action-setup version to 9.14.2 in flaky-test-detector ([8c1f459](https://github.com/ironyh/VueSIP/commit/8c1f459b8cbf672fef44087ffd97d6f35c4a0249))
* **ci:** correct Jules action reference from jules-invoke@v1 to jules-action@v1.0.0 ([13e7f05](https://github.com/ironyh/VueSIP/commit/13e7f051a3077f2443d4c230ba431465ce942485))
* **ci:** document required repository setting for release workflow ([70d37fc](https://github.com/ironyh/VueSIP/commit/70d37fcbcdceaebe6d1c8fe184dadb52a8d20e7c))
* **ci:** flaky-test-detector heredoc EOF error and coverage-diff git checkout failure ([e38d95c](https://github.com/ironyh/VueSIP/commit/e38d95c9940e81945494859dc63d4d4fdd5f5b4c))
* **ci:** improve Release workflow token diagnostic and add Node24 workaround ([c170dd3](https://github.com/ironyh/VueSIP/commit/c170dd3dd8426cc2de17f6af9b1e740726f2fc5a))
* **CI:** remove deprecated --ext flag from enterprise lint and add flatted override ([c435779](https://github.com/ironyh/VueSIP/commit/c43577996fc05d0f3cc21adaa05d6637cf73b7cb))
* **ci:** remove ignoreDeprecations (vue-tsc v2 rejects it) ([a18a65a](https://github.com/ironyh/VueSIP/commit/a18a65ad2a99b516d99751b118537f22e2646bc6))
* **ci:** skip mobile E2E tests on PRs due to consistent timeouts ([22ce594](https://github.com/ironyh/VueSIP/commit/22ce5941ba9281a5f61f251d88f2a84bd19fc709))
* **ci:** skip mobile E2E tests on PRs due to consistent timeouts ([7afdc80](https://github.com/ironyh/VueSIP/commit/7afdc801c47a74ce02c64c938783952490452cc2))
* **ci:** suppress tsconfig baseUrl deprecation warning for TS 5.x ([232248b](https://github.com/ironyh/VueSIP/commit/232248b80ff8079ff2fe806b9928a365e0b2878c))
* **ci:** suppress tsconfig baseUrl deprecation warning for TS 6+ ([2f5d81c](https://github.com/ironyh/VueSIP/commit/2f5d81c72a229f48b78ac08391700845304a7771))
* **ci:** use explicit setOutput for commentId to prevent NaN in PATCH URL ([8287a8a](https://github.com/ironyh/VueSIP/commit/8287a8ace4c276a90904e8a5da77a51918d75496))
* clamp returns max when min &gt; max ([5ad4087](https://github.com/ironyh/VueSIP/commit/5ad40872dff88a85f6af5db872626827631036de))
* complete OAuth2 mock for test coverage ([ea8dcdf](https://github.com/ironyh/VueSIP/commit/ea8dcdf37faf48cc251587631e2f00abbe2c1306))
* **constants:** add 'unknown' to NETWORK_QUALITY_LEVELS ([00b7581](https://github.com/ironyh/VueSIP/commit/00b75814a2bb45bab8b48a9dee38aa5789ded872))
* **constants:** align NETWORK_QUALITY_LEVELS with NetworkQualityLevel type ([eb56364](https://github.com/ironyh/VueSIP/commit/eb56364a520f5a9160f5da9b871046b3c8bd684c))
* **constants:** make WEBSOCKET_URL_REGEX case-insensitive ([9405eac](https://github.com/ironyh/VueSIP/commit/9405eacb99223dafda11401ad3a7e0cccb11dbe9))
* **core:** make SIP URI validation case-insensitive ([5e0debb](https://github.com/ironyh/VueSIP/commit/5e0debb66a00c499b49eb367d9a6cf6f4636dde0))
* **coverage:** switch to istanbul provider to generate coverage-summary.json ([496296b](https://github.com/ironyh/VueSIP/commit/496296bf5d1e1848156d7f2b852987616c2b8ef5))
* **credentialStorage:** validate schema on load to reject tampered storage data ([f74a2e9](https://github.com/ironyh/VueSIP/commit/f74a2e9edf82da12c79d4fe42c561349e1a6334c))
* define missing types locally in qualityReport.ts ([2272031](https://github.com/ironyh/VueSIP/commit/2272031482c3bc16cef34246e71e6ad76390779a))
* **demo-health:** add custom domain config for IVR Tester Cloudflare Pages ([fee6f87](https://github.com/ironyh/VueSIP/commit/fee6f8722c7d48ec580c8ecc105bdc11117d2e4a))
* **demo-health:** add issues:write permission for GitHub API calls ([#186](https://github.com/ironyh/VueSIP/issues/186)) ([e984ef9](https://github.com/ironyh/VueSIP/commit/e984ef9677b8e1f20f4f89672dd8f674eb8c97f6))
* **demo-health:** add issues:write permission to allow GitHub API calls ([4882afe](https://github.com/ironyh/VueSIP/commit/4882afe0c1d91a584e7ba3587284140f331665b3))
* **demo-health:** remove IVR Tester from health check (not yet deployed) ([9b34480](https://github.com/ironyh/VueSIP/commit/9b344808d16b27c88a99de7704c4d1b68b47684f))
* **deps:** update flatted to 3.4.2 (CVE fix) ([2d682a9](https://github.com/ironyh/VueSIP/commit/2d682a99464d6d93089e1e36fb1056fd57ad6d58))
* **diagnostics:** add missing TerminationCause mappings ([bb0f367](https://github.com/ironyh/VueSIP/commit/bb0f367b37df59824c34ba846ead39c55bab949d))
* **diagnostics:** add null/undefined checks to getCallDiagnostics ([8f4df62](https://github.com/ironyh/VueSIP/commit/8f4df624867154aba55d59b2ed52bbd01743ce2a))
* **diagnostics:** handle empty cause values gracefully ([2bd4f27](https://github.com/ironyh/VueSIP/commit/2bd4f27992d364994e8a3b17159d204901b505cc))
* **e2e:** increase job timeouts to prevent test cancellations ([#202](https://github.com/ironyh/VueSIP/issues/202)) ([9d11593](https://github.com/ironyh/VueSIP/commit/9d115938eb286451b2c6cde89a58aed861dee9df))
* **elks:** handle Unicode characters in Basic Auth credentials ([aca6b39](https://github.com/ironyh/VueSIP/commit/aca6b391685262a92398dff7132a8d5815551ceb))
* **encryption:** handle Map/Set in sanitizeForLogs; lowercase ALWAYS_MASK_FIELDS keys ([842b2a4](https://github.com/ironyh/VueSIP/commit/842b2a497289954d508d554e943e442e1b353a00))
* **encryption:** reject undefined data with clear error message ([a1f2f31](https://github.com/ironyh/VueSIP/commit/a1f2f31713df40f8f267d526d1beda973909abb2))
* **encryption:** remove duplicate 'apiKey' entry from ALWAYS_MASK_FIELDS ([ea76dff](https://github.com/ironyh/VueSIP/commit/ea76dff9b718c1d9b445bcc779e21dcf2fdc3994))
* **encryption:** resolve 8 TypeCheckErrors in WebCrypto BufferSource types ([b80ae92](https://github.com/ironyh/VueSIP/commit/b80ae92975dbbac34f2cd3de7d27e61dbcc9bd71))
* **encryption:** resolve 8 TypeCheckErrors in WebCrypto BufferSource types ([#188](https://github.com/ironyh/VueSIP/issues/188)) ([31ca253](https://github.com/ironyh/VueSIP/commit/31ca253f29bab7e2622f53ec743a6b67877c9b6c))
* **env.test:** replace 'any' type with Record&lt;string, unknown&gt; to eliminate lint warnings ([ba9d2c4](https://github.com/ironyh/VueSIP/commit/ba9d2c4a5d0036693812a2c09047865e7dd589f2))
* **env:** add process.env.NODE_ENV fallback to isProductionMode() ([1ba8b1d](https://github.com/ironyh/VueSIP/commit/1ba8b1d374fa0bea3f1ec404e1d4d8c197a909f1))
* **env:** improve isSecureContext with fallback for older browsers ([df032ef](https://github.com/ironyh/VueSIP/commit/df032ef07b42337523f90011d080a409acf1fd11))
* ESLint indentation in ClickToCallWidgetDemo.vue ([3726975](https://github.com/ironyh/VueSIP/commit/37269754a2c923f9ec4eee7fd953df23fe68b972))
* export useSettingsPersistence composable ([cabd069](https://github.com/ironyh/VueSIP/commit/cabd0693c8b242f03f9881a65ea5a6c55cff7180))
* **exports:** add missing composable and type exports ([8897d00](https://github.com/ironyh/VueSIP/commit/8897d00c70e30165a59b612a8af1367326fe29d2))
* **exports:** add missing Return type exports ([579f765](https://github.com/ironyh/VueSIP/commit/579f765b903f1cb29b53163fc4d858a24f7269e2))
* **exports:** add missing UseAudioDevicesReturn type export ([49d6ceb](https://github.com/ironyh/VueSIP/commit/49d6cebbb904bb8032fd200e86832f10fca3d0d4))
* **exports:** add missing UseCallHoldReturn type export ([98b60d2](https://github.com/ironyh/VueSIP/commit/98b60d28b4c14273f5eeb31bf014963bdf68ca0d))
* **exports:** add missing UseCallTransferReturn type export ([4596232](https://github.com/ironyh/VueSIP/commit/45962320b964ce0689167b318d1187b08da3ada7))
* **formatCallDirection:** always return title case for unknown directions ([7c7ff28](https://github.com/ironyh/VueSIP/commit/7c7ff282ceb71b365c389da7b3bd917467f52c24))
* **formatCallDirection:** always return title case regardless of input case ([a9aa4f1](https://github.com/ironyh/VueSIP/commit/a9aa4f1678342841db9ae4d51da74c9005572f8c))
* **formatCallTime:** handle future dates properly ([a3cca79](https://github.com/ironyh/VueSIP/commit/a3cca79d0d38f892483cd14613d93952b8b67e87))
* **formatters:** add country-specific phone formatting tests and fix bugs ([78cb4f7](https://github.com/ironyh/VueSIP/commit/78cb4f76f314248109e67a75d45fb051f20988a2))
* **formatters:** add NaN handling to formatSipStatusCode ([b8f13fc](https://github.com/ironyh/VueSIP/commit/b8f13fc2e88af3501f84daa5994a35ae93f9a952))
* **formatters:** add NaN/Infinity handling to truncate ([812d00e](https://github.com/ironyh/VueSIP/commit/812d00ebf3ebe9f8fd23e63c4fe7900d5bdac696))
* **formatters:** add null/undefined handling to formatCallDirection ([f6f1149](https://github.com/ironyh/VueSIP/commit/f6f114934362dc910fa0f6ecb3ad15fc61116026))
* **formatters:** add null/undefined handling to formatCallStatus ([30db867](https://github.com/ironyh/VueSIP/commit/30db867c049046b106028bab20c1c43b431e35e9))
* **formatters:** add null/undefined handling to formatSipStatusCode ([bd8afb0](https://github.com/ironyh/VueSIP/commit/bd8afb0a923d954b65e9ff6bdf78cd5bd9745493))
* **formatters:** add null/undefined handling to normalizePhoneNumber ([99e1187](https://github.com/ironyh/VueSIP/commit/99e118797115cb8bbc54bebe4f8407989d60ae00))
* **formatters:** add Swedish 74x/79x mobile prefixes to phone formatter ([621a40d](https://github.com/ironyh/VueSIP/commit/621a40d2bef833e82a321ea005e470d1980acd19))
* **formatters:** clamp now swaps bounds when min &gt; max ([24ef6b4](https://github.com/ironyh/VueSIP/commit/24ef6b4ca335deb6796c56d5fb1b2c55d4c2ba9e))
* **formatters:** correct clamp() behavior when min &gt; max ([1e22247](https://github.com/ironyh/VueSIP/commit/1e2224727e761f264515ad6babf06de6a8488880))
* **formatters:** correct Finland phone number formatter (+358) ([ebcebd7](https://github.com/ironyh/VueSIP/commit/ebcebd74051874096f36ad8aa1a730ee93c3be67))
* **formatters:** correct German (+49) phone number format ([a38517a](https://github.com/ironyh/VueSIP/commit/a38517a59c86a8e855fe27f1f9f9a9892b949d4a))
* **formatters:** correct phone formatter slice indices for France and Norway ([ad94092](https://github.com/ironyh/VueSIP/commit/ad940921dad98f234b6bda91aa80b046d9055c2c))
* **formatters:** correct stale Finland phone test expectation ([857e374](https://github.com/ironyh/VueSIP/commit/857e3744e826ba70f45903f013fe1225d0df0137))
* **formatters:** handle edge case in truncate when maxLength &lt; ellipsis ([7f7f735](https://github.com/ironyh/VueSIP/commit/7f7f735989f7e20755d2a0e6c47e1f33e03dec61))
* **formatters:** handle min &gt; max edge case in clamp() ([02f9c84](https://github.com/ironyh/VueSIP/commit/02f9c84eb53dd32e10544339598d4bdc6a17385e))
* **formatters:** preserve case style in formatCallDirection ([dcdb59f](https://github.com/ironyh/VueSIP/commit/dcdb59f40437e5151d27ac0d6864e5994fe82cee))
* improve type safety in ConnectionTestButton ([689a76f](https://github.com/ironyh/VueSIP/commit/689a76f2f0c56923ad194db9eded3be89d2ec81e))
* **index:** export errorHelpers utilities at top level ([7192996](https://github.com/ironyh/VueSIP/commit/71929964585499f34b0331d19d0db4308d602483))
* **lint:** disable non-null assertion warning in useConnectionHealthBar test ([0f08b64](https://github.com/ironyh/VueSIP/commit/0f08b6449c43384a3e9d94d8c5c8e212ddab9a87))
* **lint:** remove @typescript-eslint/no-explicit-any warnings in useCallRecording.test.ts ([5db3e4b](https://github.com/ironyh/VueSIP/commit/5db3e4b33c9d81905cd1033a048e124b9a54ec17))
* **lint:** remove unused computed import in useCallQualityRecorder ([cdd21e7](https://github.com/ironyh/VueSIP/commit/cdd21e7d51241cbb4a61b3f1ed537b9654c477ca))
* **lint:** replace 'any' type casts with proper unknown types ([9a5a621](https://github.com/ironyh/VueSIP/commit/9a5a6210584e96199305d63952ff792a0e80236f))
* **lint:** replace any type with undefined in test type declaration ([c87d862](https://github.com/ironyh/VueSIP/commit/c87d86249b24c3c532d2927556ecfc44bf796517))
* **lint:** suppress explicit-any warnings in test files ([fc0870a](https://github.com/ironyh/VueSIP/commit/fc0870a1bf7cc7772e34bb96133492e5b3b47aca))
* make SIP_URI_REGEX case-insensitive ([30f8bb7](https://github.com/ironyh/VueSIP/commit/30f8bb7cc79d94faed84ffa557646dcd0d50cf2e))
* **performance:** bump MAX_BUNDLE_SIZE to 800KB ([e547f27](https://github.com/ironyh/VueSIP/commit/e547f2712befd949efcaca00140fde1fa89d15ed))
* **pwa-softphone:** add missing currentAccountConfigForQr computed prop ([2160cf0](https://github.com/ironyh/VueSIP/commit/2160cf0c0edfbce55eda67c634308f0fd773a48c))
* **pwa-softphone:** resolve build errors and add missing dependencies ([f5e3a5c](https://github.com/ironyh/VueSIP/commit/f5e3a5c90d6a4ac32d07af133da2b36cfe759d2a))
* **pwa-softphone:** resolve type issues in usePhone.ts media device handling ([22fc358](https://github.com/ironyh/VueSIP/commit/22fc3589cb5a9a664508358bf8e0f8501ba796bd))
* **pwa-softphone:** use props.accountConfig instead of undefined newConfig in QrProvisioning ([c5744ed](https://github.com/ironyh/VueSIP/commit/c5744ed3e15a0682591314e7bc992f087001098e))
* **quality:** remove unused imports and replace non-null assertions with type guards ([582c4d4](https://github.com/ironyh/VueSIP/commit/582c4d423ed880b0b1837d1329a496b3218ce07d))
* **qualityReport:** correct MOS calculation for packet loss ([b17d4b6](https://github.com/ironyh/VueSIP/commit/b17d4b6dddfc9f053e510f25daaa45fd3cb848e5))
* **qualityReport:** correct MOS formula coefficient from 7e-5 to 7e-6 ([7cea780](https://github.com/ironyh/VueSIP/commit/7cea780c738213b1ab34b94610aa8676be89538a))
* remove redundant env exports from utils/index.ts ([09be2c6](https://github.com/ironyh/VueSIP/commit/09be2c68792e99cf7bead76c4085e6d4fac8d35e))
* remove unnecessary 'as any' cast in useCredentialExpiry test ([cc17a18](https://github.com/ironyh/VueSIP/commit/cc17a186154934333063b8c1102456fe20af0473))
* remove unused imports in useMediaPermissions.test ([3454f8c](https://github.com/ironyh/VueSIP/commit/3454f8c69d4aa854c28425f622106a988d54d125))
* resolve @typescript-eslint/no-explicit-any warnings in sipUri.test.ts ([f4ce9bc](https://github.com/ironyh/VueSIP/commit/f4ce9bcb7691185e42471daf3949beec52af8d35))
* resolve duplicate TypeScript exports for QualityTrend and HistoryFilter ([5c1e31e](https://github.com/ironyh/VueSIP/commit/5c1e31ed5fd5394376eeae146bf06dff31d0c4cb))
* resolve lint errors - unused vars in test, remove unused reset in ConfirmDialog ([5ba516a](https://github.com/ironyh/VueSIP/commit/5ba516a66dc9539d2b0bb16e109929f18c028a2e))
* resolve lint warnings in callDiagnostics ([60ddeda](https://github.com/ironyh/VueSIP/commit/60ddeda7810a8c6f3cfc363f26cc7c2439ef3fad))
* resolve TypeScript readonly array errors and lint warning ([0a025f3](https://github.com/ironyh/VueSIP/commit/0a025f3604ccfedb30c5332ac2423dd8f184df78))
* resolve useCallQualityHistory test throttling issue ([cb5aa18](https://github.com/ironyh/VueSIP/commit/cb5aa18b5d22c4d161ad405c28925bfabd736efb))
* security vulnerabilities (undici + yauzl) ([ab8751f](https://github.com/ironyh/VueSIP/commit/ab8751f54bff0399e72f78bf2c114bb5c7ed821e))
* **test:** eliminate non-null assertions in sipUri tests ([87ac7c3](https://github.com/ironyh/VueSIP/commit/87ac7c3f6006ccde3d9d4bb9c795d35764dc4284))
* **test:** enable TypeScript type-checking in vitest ([3b36a0d](https://github.com/ironyh/VueSIP/commit/3b36a0db8cd72473561ecc9369d7257cf8f1e5fd))
* **testing:** waitForValue generates descriptive error messages on timeout ([a979d8d](https://github.com/ironyh/VueSIP/commit/a979d8d09277c70e6d8a49944b2eee15c49a3526))
* **test:** migrate vitest poolOptions to top-level config (Vitest 4+) ([b39eb59](https://github.com/ironyh/VueSIP/commit/b39eb59eb1895822ede10eec4e72dc88063f272e))
* **test:** relax event listener scaling threshold for CI environments ([58b211c](https://github.com/ironyh/VueSIP/commit/58b211c98754b506f89daaf56b94a03af7b89deb))
* **test:** remove any type cast in useMediaPermissions test ([074a9a1](https://github.com/ironyh/VueSIP/commit/074a9a19ae27557e748e83aa2706ce0a51cd6ab2))
* **test:** remove any type casts in useTranscription tests ([a991040](https://github.com/ironyh/VueSIP/commit/a991040c5a0036d57eafc760fdf8e8f30869bd51))
* **test:** remove duplicate iceConnectionState property in mock RTCPeerConnection ([9306644](https://github.com/ironyh/VueSIP/commit/9306644d9976f76173991739079cd21c046c6b0f))
* **test:** remove incorrect lastUpdated assertion in useCallQualityStats test ([75a2231](https://github.com/ironyh/VueSIP/commit/75a2231b6ee3434cdbf8f9d67adafc1871929333))
* **test:** remove non-null assertions in useAmiBase.test.ts ([e8230b2](https://github.com/ironyh/VueSIP/commit/e8230b232843b65ecf5434f858387c0cece1d99e))
* **test:** remove non-null assertions in useCallQualityScore tests ([80d1544](https://github.com/ironyh/VueSIP/commit/80d154451ee4f0eb313b452cb87db1e9bd302893))
* **test:** replace 'any' type casts with proper TestMockProvider type ([66da618](https://github.com/ironyh/VueSIP/commit/66da6189622d3225e24b4d6de586aaaece2fd824))
* **test:** replace 'as any' with proper type cast in usePresence test ([5c06edf](https://github.com/ironyh/VueSIP/commit/5c06edf143512f611615e3ebd93997a53baf86d5))
* **test:** replace any with unknown in mock RTCSession ([ae31613](https://github.com/ironyh/VueSIP/commit/ae31613f34451160f193a0d4b658276dd725e12e))
* **test:** replace explicit any with DTMFEvent type ([77ba56c](https://github.com/ironyh/VueSIP/commit/77ba56c67a48974dcfe2a519bc928c1cd37b1201))
* **test:** replace non-null assertions with optional chaining in voipms tests ([b0e85b7](https://github.com/ironyh/VueSIP/commit/b0e85b7073c63a2b2abcd02239e4c4c6c331b995))
* **test:** replace non-null assertions with type-safe helper in useMultiSipClient ([2127bc6](https://github.com/ironyh/VueSIP/commit/2127bc61a003d8f8042fb34c5236c49429bba8f0))
* **test:** replace unsafe 'any' casts with proper types in useDialStrategy tests ([e93fd48](https://github.com/ironyh/VueSIP/commit/e93fd487290426c7da38a1bdfb9eac507a0d067e))
* **test:** resolve TypeScript any lint warnings in useConnectionTest.test.ts ([d972bcf](https://github.com/ironyh/VueSIP/commit/d972bcfc8185b854c44253ca2ff91ce1461e8fbc))
* **tests:** add missing .value for ref comparisons in useMediaPermissions tests ([334a4b7](https://github.com/ironyh/VueSIP/commit/334a4b7f86a2138cc06e3efe88ae00f34bb2c5b6))
* **tests:** improve MediaManager ICE logging test mock factory ([2bc676b](https://github.com/ironyh/VueSIP/commit/2bc676b7b67146b29b241d953f170b7ec8d954c7))
* **test:** update clamp() test to match swapped bounds behavior ([3037605](https://github.com/ironyh/VueSIP/commit/30376059c6545bf18aa3d95e6bf144101ca0af9c))
* **test:** use Vue refs in ConfirmDialog test mock ([e52f057](https://github.com/ironyh/VueSIP/commit/e52f057a1fba8c9ab5f66c174884983508d31470))
* **types:** remove any type casts in useGracefulDegradation tests ([5dc5b08](https://github.com/ironyh/VueSIP/commit/5dc5b08b3fe09f377118cc5f3ebf5f5d4170aabf))
* **types:** replace any casts with proper types in useGracefulDegradation tests ([41589fa](https://github.com/ironyh/VueSIP/commit/41589fac0b2d9343e25d2c8e7d28cdb19bb5c1a8))
* **types:** resolve TypeScript strict null checks in callQualityHistory ([682078e](https://github.com/ironyh/VueSIP/commit/682078e633da9c925c39f5898bc93db8dad37b76))
* update pnpm-lock.yaml to resolve ERR_PNPM_LOCKFILE_CONFIG_MISMATCH ([bdf2303](https://github.com/ironyh/VueSIP/commit/bdf2303359b23b263f6f0a4e36d695e91da813b9))
* **use46ElksApi:** remove duplicate lines in clear() and add unit tests ([b5a04d5](https://github.com/ironyh/VueSIP/commit/b5a04d5fe3adc3c8587ab57b57b5dac3e80c948a))
* **useAmiCDR:** resolve 2 TypeCheckErrors (operator precedence) ([7e21d7c](https://github.com/ironyh/VueSIP/commit/7e21d7ca10e547a4a95002ec1b66517038467f7d))
* **useAmiCDR:** use ?? fallback for indexed access to satisfy noUncheckedIndexedAccess ([2e8f4fe](https://github.com/ironyh/VueSIP/commit/2e8f4fe0942bae94be8b9b5a775ee31499be6866))
* **useAmiCDR:** use explicit conditional instead of optional chaining in array index ([b6c8ced](https://github.com/ironyh/VueSIP/commit/b6c8ced038af199dc7ede517f45e13b9f9d9704a))
* **useAmiCDR:** use explicit if-branching for type narrowing ([ef510c2](https://github.com/ironyh/VueSIP/commit/ef510c25fe27db6070667fc692e54570fe71ed6f))
* **useAmiCDR:** use instanceof Date guard for explicit type narrowing ([e28e77c](https://github.com/ironyh/VueSIP/commit/e28e77c6f5f83713b66ec80f7ce223d9641c5658))
* **useCallQualityHistory:** replace non-null assertions with type casts ([8fcc655](https://github.com/ironyh/VueSIP/commit/8fcc6551403eb42d1df9a62a51c89fb22a5be47f))
* **useCallQualityStats:** replace any with DtmfSessionSource type ([25405ce](https://github.com/ironyh/VueSIP/commit/25405ce33731b7fe2f32b72ac0d8046ed7902b6c))
* **useCallQualityStats:** resolve TypeScript narrowing issues in stats collection ([ab5bd47](https://github.com/ironyh/VueSIP/commit/ab5bd47e70fe5493e1f883c8cf6437dc37d8f51f))
* **useConnectionTest:** change hardcoded Swedish strings to English ([25b8810](https://github.com/ironyh/VueSIP/commit/25b881030ec8405aeb7e0209f832ef5d10512a55))
* **useConnectionTest:** remove redundant dynamic import ([4a92907](https://github.com/ironyh/VueSIP/commit/4a929070cb28ec96949d96eb0009ac3cc88bac4e))
* **useGalleryLayout:** remove rows cap to prevent overflow for 17-24 participants ([86111e9](https://github.com/ironyh/VueSIP/commit/86111e9f9dbac18e22e3f910e58b6700067d0750))
* **useMessaging test:** replace any[] with MessagingEvent[] type annotations ([75e51da](https://github.com/ironyh/VueSIP/commit/75e51daa55052de9ece23380bef89e17a88f88b3))
* **usePushNotifications:** improve type safety with extended options and proper NotificationOptions cast ([0234118](https://github.com/ironyh/VueSIP/commit/02341184839722c7ea3242d87e71b7dbe2263076))
* **usePushNotifications:** replace any types with proper Service Worker types ([b6cfe70](https://github.com/ironyh/VueSIP/commit/b6cfe70daccfb150f5bb47738adbe0e22262e9b9))
* **useQualityAlerts:** add missing computed import ([054317f](https://github.com/ironyh/VueSIP/commit/054317f4cd919e627507ec2ccefff28d788d8b60))
* **useSentiment:** handle edge case when min &gt; max in clamp() ([2f9fa8b](https://github.com/ironyh/VueSIP/commit/2f9fa8bcd0043496fd004e8db5cd10da5f511b3a))
* **useTheme:** add SSR/non-browser environment guards ([670224a](https://github.com/ironyh/VueSIP/commit/670224aa7f5449a7987b2c0dd081d9f12a8fb731))
* **utils:** export missing callQualityHistory utilities ([f550783](https://github.com/ironyh/VueSIP/commit/f550783b1a8fc40b147fbc5c495457d217e44aed))
* **validators:** add missing isValid field to validatePhoneNumber ([5e8c60e](https://github.com/ironyh/VueSIP/commit/5e8c60ea55aa4cdc99c2ff528830a6d3ffea5843))
* **validators:** handle URLs without hostname in validateUrl ([f6ecb91](https://github.com/ironyh/VueSIP/commit/f6ecb91f428531fb9adaf717df89fb4d1a5d1375))
* **validators:** improve URL hostname validation error message ([accb0bd](https://github.com/ironyh/VueSIP/commit/accb0bde3cc1a0452088fe4195703db28e8d762b))
* **validators:** replace process.env.NODE_ENV with isProductionMode() ([d53f127](https://github.com/ironyh/VueSIP/commit/d53f1278ff43c00541129cb1e20c0e3510a4885d))
* **webrtc:** default STUN servers when rtcConfiguration not provided ([5a6f142](https://github.com/ironyh/VueSIP/commit/5a6f142a9c3cee82e0cc65778b51fbb9b686a3bc))


### Performance Improvements

* optimize breakoutAllCallers with concurrent requests ([3381ed4](https://github.com/ironyh/VueSIP/commit/3381ed4d58cc0509e30ad38c689884dfa5de29b7))
* optimize call history statistics calculation ([47da5b8](https://github.com/ironyh/VueSIP/commit/47da5b85af248f411f08e949c085279d4b28f143))
* use Map for efficient queue lookups in useAmiAgentLogin ([2f1c0db](https://github.com/ironyh/VueSIP/commit/2f1c0db07749c32832d4a4e4129b81c2cfb4babe))

## 1.0.0 (2026-03-28)


### Features

* add ConnectionTestButton to PWA softphone header ([a07027a](https://github.com/ironyh/VueSIP/commit/a07027adb14acf651c12675a69eb358a42a9fae2))
* add isWebRtcError helper for WebRTC error detection ([628e0b8](https://github.com/ironyh/VueSIP/commit/628e0b8ea20b9e1e3ae527135defddd71ac22c64))
* add unit tests for useSuggester composable ([ab071aa](https://github.com/ironyh/VueSIP/commit/ab071aaa91b7fe989c3fb3bd9fd8d626b77794dc))
* Add useCallRecording composable for WebRTC call recording ([0bee3d1](https://github.com/ironyh/VueSIP/commit/0bee3d1eba50f8af46ee406af84330d99361d366))
* add usePushNotifications PWA composable ([076fab2](https://github.com/ironyh/VueSIP/commit/076fab2fb99989f8c813d78391ef3f6dc874cb93))
* **api:** export constants from main entry point ([da30303](https://github.com/ironyh/VueSIP/commit/da30303c4c0cefd7f27a16d5f5195f7c8c2deb6d))
* **CallSession:** add last error diagnostics properties ([3726975](https://github.com/ironyh/VueSIP/commit/37269754a2c923f9ec4eee7fd953df23fe68b972))
* **ci:** add npm audit security automation workflow ([39cccb3](https://github.com/ironyh/VueSIP/commit/39cccb354fe9f8d0049f5d38bfea8a553b032031))
* **composables:** add useConnectionTest for pre-call diagnostics ([442d074](https://github.com/ironyh/VueSIP/commit/442d0747ba3d0e5ec3c63900229c720df0c525f4))
* **composables:** export useCallQualityStats ([b687c21](https://github.com/ironyh/VueSIP/commit/b687c21307ef2567df99bd272f50570c2135c49b))
* **composables:** improve useMediaDevices error messages with codes and guidance ([f649be1](https://github.com/ironyh/VueSIP/commit/f649be198720d16fcba6ad7b9b91b93dd33a88f9))
* **constants:** add network quality levels and thresholds ([20fc95f](https://github.com/ironyh/VueSIP/commit/20fc95f5634ae94482fddd7ce898e5c7cbab6306))
* **demos:** add automated health monitoring ([734a55b](https://github.com/ironyh/VueSIP/commit/734a55bb9dcc9b18639ea7716c08838ea284ad8d))
* **encryption:** add sanitizeForLogs utility for safe logging ([eaf3417](https://github.com/ironyh/VueSIP/commit/eaf3417d6863cf0ebf3dbf084a9ce2e2638127ac))
* **env:** add browser and OS detection utilities ([1b7ac6e](https://github.com/ironyh/VueSIP/commit/1b7ac6e72e3bbfbfc48f151e411d6cac7b8bad8d))
* **env:** add isBrowser() utility for environment detection ([40948c6](https://github.com/ironyh/VueSIP/commit/40948c618b1a866a3dde26163471591f1a2e017c))
* **env:** add isIframe utility for embed detection ([1688e1c](https://github.com/ironyh/VueSIP/commit/1688e1c1de1569c1a3941e582cf0fc8ad3f678bb))
* **env:** add isMobileDevice() utility for mobile browser detection ([ea55ab9](https://github.com/ironyh/VueSIP/commit/ea55ab9c22cc8214d8b3d449502531d15b321c3a))
* **env:** add isSecureContext for WebRTC requirement detection ([a595cb9](https://github.com/ironyh/VueSIP/commit/a595cb948cf433a83f40fc7120e226f30662247a))
* **env:** add isWebRTCSupported utility function ([c8ea224](https://github.com/ironyh/VueSIP/commit/c8ea2240c9e2621ea25aa7fb1a91672d43bdf6f5))
* **errorHelpers:** add DOMException type guards ([66bbb4d](https://github.com/ironyh/VueSIP/commit/66bbb4d30ce7fc989fb39a0f5e1dd80d84984f91))
* **errorHelpers:** add isRangeError, isSyntaxError, isReferenceError type guards ([ccc9ab1](https://github.com/ironyh/VueSIP/commit/ccc9ab1539765946518ad1da205a67dfc78cb193))
* **errorHelpers:** add isSipStatusCodeError type guard for SIP error detection ([add70d1](https://github.com/ironyh/VueSIP/commit/add70d19a9dfa4f81da33cb42dc4ad4409613930))
* **errorHelpers:** add isTimeoutError type guard ([f3786bd](https://github.com/ironyh/VueSIP/commit/f3786bd2cca77dea1ee416ed9afd205c856eccd8))
* **EventEmitter:** add getHandlers method for testing and debugging ([9513f61](https://github.com/ironyh/VueSIP/commit/9513f6197e6b0d83041eeb8d51dee795b2f665c1))
* **EventEmitter:** add hasListener method for checking specific handlers ([01322de](https://github.com/ironyh/VueSIP/commit/01322de6f8f8deecd097e19bb0e5dc830d6c3ae4))
* export quality report utilities from main API ([4085ec8](https://github.com/ironyh/VueSIP/commit/4085ec8d1084f4100b9d640b12858ba954f3f00d))
* **exports:** add missing 46elks API service exports ([d85e2a9](https://github.com/ironyh/VueSIP/commit/d85e2a93b84edad35121ab41024e8c34aa192c1f))
* **formatters:** add clamp utility function ([6b23477](https://github.com/ironyh/VueSIP/commit/6b23477e8bf65a242a0a23b5706531d7921c0885))
* **formatters:** add formatMilliseconds utility for WebRTC stats ([f728610](https://github.com/ironyh/VueSIP/commit/f7286104f4253d6d889de0bf0cc7b9e8b560e0c1))
* **formatters:** add formatSipStatusCode for human-readable SIP status messages ([7792fd4](https://github.com/ironyh/VueSIP/commit/7792fd4483a23baa1c3c4932d3808b900197770b))
* **formatters:** add multi-country phone number formatting support ([15e853f](https://github.com/ironyh/VueSIP/commit/15e853f1b2bd8e4a515620d2ba67e0a5ac6e231e))
* **formatters:** add parseQueryString utility function ([7dd652d](https://github.com/ironyh/VueSIP/commit/7dd652d2975daf8200b3d58d055f4dc8c9dfafa4))
* improve coverage diff workflow, raise bundle thresholds, add CRM/TransportManager tests ([75e93e9](https://github.com/ironyh/VueSIP/commit/75e93e938f2feb90891b2c1cec6d29ebb01fc715))
* **index:** export IceConnectionState and IceGatheringState types ([91fa324](https://github.com/ironyh/VueSIP/commit/91fa32477d25a955b254351382676d444e29d20e))
* **mediamanager:** ICE connection state transition logging with correlation IDs ([1f4aa4a](https://github.com/ironyh/VueSIP/commit/1f4aa4ab624c34c32d9d394b0e2d85bbd409ca90))
* **overlay:** add CallFailureOverlay component for call diagnostics ([329842f](https://github.com/ironyh/VueSIP/commit/329842fe887f9a6d08d19f58668a1b53f0f26365))
* **pwa-softphone:** add QR provisioning settings tab ([062400c](https://github.com/ironyh/VueSIP/commit/062400c93b1d4d19b9ee96e98a1b4d2ba2ce1ded))
* **pwa-softphone:** add record button and controls to CallScreen ([5c54652](https://github.com/ironyh/VueSIP/commit/5c5465219de1d1001193b53cbdb9dd47c97ea526))
* **pwa-softphone:** wire DiagnosticsPanel to real-time SipClient data (Phase 1) ([f7ed0ad](https://github.com/ironyh/VueSIP/commit/f7ed0ad3e13b1f14f38ac60d021a450abfed1bb5))
* **pwa:** add early media permission check to reduce first-call friction ([90be920](https://github.com/ironyh/VueSIP/commit/90be92066de9b2ae9ea9d97ddb81cd4323c8a1b5))
* **recording:** auto-start recording when persistence enabled and call becomes active ([8a76c6b](https://github.com/ironyh/VueSIP/commit/8a76c6bed86391950a105f7a58dfe3490ad097f4))
* **scripts:** add health monitoring cron script ([165c8ac](https://github.com/ironyh/VueSIP/commit/165c8ac3fe44d1378e919eb607adbf782ccb2e53))
* **suggester:** add triageQuestionBank as shared TypeScript utility ([f7039ba](https://github.com/ironyh/VueSIP/commit/f7039ba65f20dfc88165e426787f4bd062c491ab))
* **suggester:** add useSuggester composable + SuggesterChip/SuggesterPanel components ([08d821e](https://github.com/ironyh/VueSIP/commit/08d821e090449424103c4e4d346af3eb76f1c89d))
* **template:** add call recording to CallScreen ([a911b2f](https://github.com/ironyh/VueSIP/commit/a911b2fb29f11f7a043f8357ddb25ca35bb67947))
* **testing:** add createDeferred utility and tests ([53f7f1d](https://github.com/ironyh/VueSIP/commit/53f7f1d10d27f55e208e47d5d08ee4096b9f82b8))
* **testing:** add waitFor async condition utilities ([ba91480](https://github.com/ironyh/VueSIP/commit/ba914809967935e2d997df127d195393a7e0d445))
* **testing:** export waitFor utilities from main index ([465d217](https://github.com/ironyh/VueSIP/commit/465d217dcb8217bb15922ae23af8b114d81a6773))
* **types:** export diagnostic types for external use ([e8af31c](https://github.com/ironyh/VueSIP/commit/e8af31ccd8c08923b75e794c5ceda3302f3433fa))
* **types:** export logger and error context types for external use ([3bc6e69](https://github.com/ironyh/VueSIP/commit/3bc6e69325ed5d376f3a5ee6d3f30908941cb119))
* **utils:** add extended SIP URI parsing utilities ([e882528](https://github.com/ironyh/VueSIP/commit/e88252801eed53aebe4f0b93503a637a2b5bac3e))
* **utils:** add isDevelopmentMode() environment utility ([bd0d023](https://github.com/ironyh/VueSIP/commit/bd0d0235cd56eda0aa1521d6d254c5e405f68b11))
* **utils:** add isNetworkError helper for error handling ([5fdfe7c](https://github.com/ironyh/VueSIP/commit/5fdfe7c3def3ba0554c5424fc741646cae1598dd))
* **utils:** add isProductionMode() environment utility ([81e2142](https://github.com/ironyh/VueSIP/commit/81e21425541dc898c0e47b314b84501241c65164))
* **utils:** add PWA and service worker detection utilities ([7ef7bc9](https://github.com/ironyh/VueSIP/commit/7ef7bc9dd255c10bbfe18006397c67e64391c3ee))
* **utils:** add runtime input validation for callDiagnostics suggestions ([fbd7590](https://github.com/ironyh/VueSIP/commit/fbd7590b4fa448d5b3afef6156e15c8311bd6008))
* **utils:** add SIP/WebRTC error helpers for reliability ([c79597a](https://github.com/ironyh/VueSIP/commit/c79597a94dd082b002e4c21cf334e82e62894bcf))
* **utils:** export callDiagnostics utilities from main index ([7bf54c9](https://github.com/ironyh/VueSIP/commit/7bf54c95be3898c92cc9d65f61f9b45a1e1facce))
* **utils:** export qualityReport utilities from index ([7c2574d](https://github.com/ironyh/VueSIP/commit/7c2574d054472958db8359b2b13e7595b624003d))
* **utils:** export SimpleValidationResult type ([31e7269](https://github.com/ironyh/VueSIP/commit/31e72696970fd05806f99515ea5ce372b4f82a68))
* **validators:** add validateUrl utility for general URL validation ([2dcfcce](https://github.com/ironyh/VueSIP/commit/2dcfcce9a10f6bad0b374c518ae122e5a7ff4e59))


### Bug Fixes

* add missing Vue type imports in useMediaPermissions ([bbb1cd8](https://github.com/ironyh/VueSIP/commit/bbb1cd8a72959a69b4c8cdb5c36248bc5097bec5))
* add picomatch override to resolve security audit failure ([7ecc0cb](https://github.com/ironyh/VueSIP/commit/7ecc0cb52c42a2651adbc93b41f1881b9092f546))
* **amiservice:** fix auto-reconnect memory leak and broken reconnect handler ([6ff390f](https://github.com/ironyh/VueSIP/commit/6ff390f160d1bcafefd531f4295ba540fe201799))
* apply rtcConfiguration to incoming call answers (ICE candidates) ([2c13433](https://github.com/ironyh/VueSIP/commit/2c13433245f40c1327c54a7c19ddfb12b1ec6354))
* **bundle-size:** correct thresholds — was always failing (~2500KB vs 500KB limit) ([692bf2c](https://github.com/ironyh/VueSIP/commit/692bf2c901f77f83e8dd9e376f079097e4187f11))
* **CallScreen:** add missing pauseRecording and resumeRecording imports ([e5e3995](https://github.com/ironyh/VueSIP/commit/e5e39956ca006cc5455a72a0dbfc894368c782f6))
* **cdr:** resolve 3 TypeCheckErrors in performance tests ([0e6d054](https://github.com/ironyh/VueSIP/commit/0e6d0549f602da9f19beb97a6772c88b02c2256d))
* **ci:** add checkout step to PR Staleness Monitor workflow ([2447277](https://github.com/ironyh/VueSIP/commit/2447277352ccc9817a92c7fe76dfe07f8e8157dc))
* **ci:** add checkout step to Release workflow to fix commit creation error ([7b4fd04](https://github.com/ironyh/VueSIP/commit/7b4fd04043e20d8755670590cc94d8bc4f7f1ebe))
* **ci:** align pnpm/action-setup version to 9.14.2 in flaky-test-detector ([8c1f459](https://github.com/ironyh/VueSIP/commit/8c1f459b8cbf672fef44087ffd97d6f35c4a0249))
* **ci:** correct Jules action reference from jules-invoke@v1 to jules-action@v1.0.0 ([13e7f05](https://github.com/ironyh/VueSIP/commit/13e7f051a3077f2443d4c230ba431465ce942485))
* **ci:** document required repository setting for release workflow ([70d37fc](https://github.com/ironyh/VueSIP/commit/70d37fcbcdceaebe6d1c8fe184dadb52a8d20e7c))
* **ci:** flaky-test-detector heredoc EOF error and coverage-diff git checkout failure ([e38d95c](https://github.com/ironyh/VueSIP/commit/e38d95c9940e81945494859dc63d4d4fdd5f5b4c))
* **ci:** improve Release workflow token diagnostic and add Node24 workaround ([c170dd3](https://github.com/ironyh/VueSIP/commit/c170dd3dd8426cc2de17f6af9b1e740726f2fc5a))
* **CI:** remove deprecated --ext flag from enterprise lint and add flatted override ([c435779](https://github.com/ironyh/VueSIP/commit/c43577996fc05d0f3cc21adaa05d6637cf73b7cb))
* **ci:** remove ignoreDeprecations (vue-tsc v2 rejects it) ([a18a65a](https://github.com/ironyh/VueSIP/commit/a18a65ad2a99b516d99751b118537f22e2646bc6))
* **ci:** skip mobile E2E tests on PRs due to consistent timeouts ([22ce594](https://github.com/ironyh/VueSIP/commit/22ce5941ba9281a5f61f251d88f2a84bd19fc709))
* **ci:** skip mobile E2E tests on PRs due to consistent timeouts ([7afdc80](https://github.com/ironyh/VueSIP/commit/7afdc801c47a74ce02c64c938783952490452cc2))
* **ci:** suppress tsconfig baseUrl deprecation warning for TS 5.x ([232248b](https://github.com/ironyh/VueSIP/commit/232248b80ff8079ff2fe806b9928a365e0b2878c))
* **ci:** suppress tsconfig baseUrl deprecation warning for TS 6+ ([2f5d81c](https://github.com/ironyh/VueSIP/commit/2f5d81c72a229f48b78ac08391700845304a7771))
* **ci:** use explicit setOutput for commentId to prevent NaN in PATCH URL ([8287a8a](https://github.com/ironyh/VueSIP/commit/8287a8ace4c276a90904e8a5da77a51918d75496))
* clamp returns max when min &gt; max ([5ad4087](https://github.com/ironyh/VueSIP/commit/5ad40872dff88a85f6af5db872626827631036de))
* complete OAuth2 mock for test coverage ([ea8dcdf](https://github.com/ironyh/VueSIP/commit/ea8dcdf37faf48cc251587631e2f00abbe2c1306))
* **constants:** add 'unknown' to NETWORK_QUALITY_LEVELS ([00b7581](https://github.com/ironyh/VueSIP/commit/00b75814a2bb45bab8b48a9dee38aa5789ded872))
* **constants:** align NETWORK_QUALITY_LEVELS with NetworkQualityLevel type ([eb56364](https://github.com/ironyh/VueSIP/commit/eb56364a520f5a9160f5da9b871046b3c8bd684c))
* **constants:** make WEBSOCKET_URL_REGEX case-insensitive ([9405eac](https://github.com/ironyh/VueSIP/commit/9405eacb99223dafda11401ad3a7e0cccb11dbe9))
* **core:** make SIP URI validation case-insensitive ([5e0debb](https://github.com/ironyh/VueSIP/commit/5e0debb66a00c499b49eb367d9a6cf6f4636dde0))
* **coverage:** switch to istanbul provider to generate coverage-summary.json ([496296b](https://github.com/ironyh/VueSIP/commit/496296bf5d1e1848156d7f2b852987616c2b8ef5))
* **credentialStorage:** validate schema on load to reject tampered storage data ([f74a2e9](https://github.com/ironyh/VueSIP/commit/f74a2e9edf82da12c79d4fe42c561349e1a6334c))
* define missing types locally in qualityReport.ts ([2272031](https://github.com/ironyh/VueSIP/commit/2272031482c3bc16cef34246e71e6ad76390779a))
* **demo-health:** add custom domain config for IVR Tester Cloudflare Pages ([fee6f87](https://github.com/ironyh/VueSIP/commit/fee6f8722c7d48ec580c8ecc105bdc11117d2e4a))
* **demo-health:** add issues:write permission for GitHub API calls ([#186](https://github.com/ironyh/VueSIP/issues/186)) ([e984ef9](https://github.com/ironyh/VueSIP/commit/e984ef9677b8e1f20f4f89672dd8f674eb8c97f6))
* **demo-health:** add issues:write permission to allow GitHub API calls ([4882afe](https://github.com/ironyh/VueSIP/commit/4882afe0c1d91a584e7ba3587284140f331665b3))
* **demo-health:** remove IVR Tester from health check (not yet deployed) ([9b34480](https://github.com/ironyh/VueSIP/commit/9b344808d16b27c88a99de7704c4d1b68b47684f))
* **deps:** update flatted to 3.4.2 (CVE fix) ([2d682a9](https://github.com/ironyh/VueSIP/commit/2d682a99464d6d93089e1e36fb1056fd57ad6d58))
* **diagnostics:** add missing TerminationCause mappings ([bb0f367](https://github.com/ironyh/VueSIP/commit/bb0f367b37df59824c34ba846ead39c55bab949d))
* **diagnostics:** add null/undefined checks to getCallDiagnostics ([8f4df62](https://github.com/ironyh/VueSIP/commit/8f4df624867154aba55d59b2ed52bbd01743ce2a))
* **diagnostics:** handle empty cause values gracefully ([2bd4f27](https://github.com/ironyh/VueSIP/commit/2bd4f27992d364994e8a3b17159d204901b505cc))
* **elks:** handle Unicode characters in Basic Auth credentials ([aca6b39](https://github.com/ironyh/VueSIP/commit/aca6b391685262a92398dff7132a8d5815551ceb))
* **encryption:** handle Map/Set in sanitizeForLogs; lowercase ALWAYS_MASK_FIELDS keys ([842b2a4](https://github.com/ironyh/VueSIP/commit/842b2a497289954d508d554e943e442e1b353a00))
* **encryption:** reject undefined data with clear error message ([a1f2f31](https://github.com/ironyh/VueSIP/commit/a1f2f31713df40f8f267d526d1beda973909abb2))
* **encryption:** remove duplicate 'apiKey' entry from ALWAYS_MASK_FIELDS ([ea76dff](https://github.com/ironyh/VueSIP/commit/ea76dff9b718c1d9b445bcc779e21dcf2fdc3994))
* **encryption:** resolve 8 TypeCheckErrors in WebCrypto BufferSource types ([b80ae92](https://github.com/ironyh/VueSIP/commit/b80ae92975dbbac34f2cd3de7d27e61dbcc9bd71))
* **encryption:** resolve 8 TypeCheckErrors in WebCrypto BufferSource types ([#188](https://github.com/ironyh/VueSIP/issues/188)) ([31ca253](https://github.com/ironyh/VueSIP/commit/31ca253f29bab7e2622f53ec743a6b67877c9b6c))
* **env.test:** replace 'any' type with Record&lt;string, unknown&gt; to eliminate lint warnings ([ba9d2c4](https://github.com/ironyh/VueSIP/commit/ba9d2c4a5d0036693812a2c09047865e7dd589f2))
* **env:** add process.env.NODE_ENV fallback to isProductionMode() ([1ba8b1d](https://github.com/ironyh/VueSIP/commit/1ba8b1d374fa0bea3f1ec404e1d4d8c197a909f1))
* **env:** improve isSecureContext with fallback for older browsers ([df032ef](https://github.com/ironyh/VueSIP/commit/df032ef07b42337523f90011d080a409acf1fd11))
* ESLint indentation in ClickToCallWidgetDemo.vue ([3726975](https://github.com/ironyh/VueSIP/commit/37269754a2c923f9ec4eee7fd953df23fe68b972))
* export useSettingsPersistence composable ([cabd069](https://github.com/ironyh/VueSIP/commit/cabd0693c8b242f03f9881a65ea5a6c55cff7180))
* **exports:** add missing composable and type exports ([8897d00](https://github.com/ironyh/VueSIP/commit/8897d00c70e30165a59b612a8af1367326fe29d2))
* **exports:** add missing Return type exports ([579f765](https://github.com/ironyh/VueSIP/commit/579f765b903f1cb29b53163fc4d858a24f7269e2))
* **exports:** add missing UseAudioDevicesReturn type export ([49d6ceb](https://github.com/ironyh/VueSIP/commit/49d6cebbb904bb8032fd200e86832f10fca3d0d4))
* **exports:** add missing UseCallHoldReturn type export ([98b60d2](https://github.com/ironyh/VueSIP/commit/98b60d28b4c14273f5eeb31bf014963bdf68ca0d))
* **exports:** add missing UseCallTransferReturn type export ([4596232](https://github.com/ironyh/VueSIP/commit/45962320b964ce0689167b318d1187b08da3ada7))
* **formatCallDirection:** always return title case for unknown directions ([7c7ff28](https://github.com/ironyh/VueSIP/commit/7c7ff282ceb71b365c389da7b3bd917467f52c24))
* **formatCallDirection:** always return title case regardless of input case ([a9aa4f1](https://github.com/ironyh/VueSIP/commit/a9aa4f1678342841db9ae4d51da74c9005572f8c))
* **formatCallTime:** handle future dates properly ([a3cca79](https://github.com/ironyh/VueSIP/commit/a3cca79d0d38f892483cd14613d93952b8b67e87))
* **formatters:** add country-specific phone formatting tests and fix bugs ([78cb4f7](https://github.com/ironyh/VueSIP/commit/78cb4f76f314248109e67a75d45fb051f20988a2))
* **formatters:** add NaN handling to formatSipStatusCode ([b8f13fc](https://github.com/ironyh/VueSIP/commit/b8f13fc2e88af3501f84daa5994a35ae93f9a952))
* **formatters:** add NaN/Infinity handling to truncate ([812d00e](https://github.com/ironyh/VueSIP/commit/812d00ebf3ebe9f8fd23e63c4fe7900d5bdac696))
* **formatters:** add null/undefined handling to formatCallDirection ([f6f1149](https://github.com/ironyh/VueSIP/commit/f6f114934362dc910fa0f6ecb3ad15fc61116026))
* **formatters:** add null/undefined handling to formatCallStatus ([30db867](https://github.com/ironyh/VueSIP/commit/30db867c049046b106028bab20c1c43b431e35e9))
* **formatters:** add null/undefined handling to formatSipStatusCode ([bd8afb0](https://github.com/ironyh/VueSIP/commit/bd8afb0a923d954b65e9ff6bdf78cd5bd9745493))
* **formatters:** add null/undefined handling to normalizePhoneNumber ([99e1187](https://github.com/ironyh/VueSIP/commit/99e118797115cb8bbc54bebe4f8407989d60ae00))
* **formatters:** add Swedish 74x/79x mobile prefixes to phone formatter ([621a40d](https://github.com/ironyh/VueSIP/commit/621a40d2bef833e82a321ea005e470d1980acd19))
* **formatters:** clamp now swaps bounds when min &gt; max ([24ef6b4](https://github.com/ironyh/VueSIP/commit/24ef6b4ca335deb6796c56d5fb1b2c55d4c2ba9e))
* **formatters:** correct clamp() behavior when min &gt; max ([1e22247](https://github.com/ironyh/VueSIP/commit/1e2224727e761f264515ad6babf06de6a8488880))
* **formatters:** correct Finland phone number formatter (+358) ([ebcebd7](https://github.com/ironyh/VueSIP/commit/ebcebd74051874096f36ad8aa1a730ee93c3be67))
* **formatters:** correct German (+49) phone number format ([a38517a](https://github.com/ironyh/VueSIP/commit/a38517a59c86a8e855fe27f1f9f9a9892b949d4a))
* **formatters:** correct phone formatter slice indices for France and Norway ([ad94092](https://github.com/ironyh/VueSIP/commit/ad940921dad98f234b6bda91aa80b046d9055c2c))
* **formatters:** correct stale Finland phone test expectation ([857e374](https://github.com/ironyh/VueSIP/commit/857e3744e826ba70f45903f013fe1225d0df0137))
* **formatters:** handle edge case in truncate when maxLength &lt; ellipsis ([7f7f735](https://github.com/ironyh/VueSIP/commit/7f7f735989f7e20755d2a0e6c47e1f33e03dec61))
* **formatters:** handle min &gt; max edge case in clamp() ([02f9c84](https://github.com/ironyh/VueSIP/commit/02f9c84eb53dd32e10544339598d4bdc6a17385e))
* **formatters:** preserve case style in formatCallDirection ([dcdb59f](https://github.com/ironyh/VueSIP/commit/dcdb59f40437e5151d27ac0d6864e5994fe82cee))
* improve type safety in ConnectionTestButton ([689a76f](https://github.com/ironyh/VueSIP/commit/689a76f2f0c56923ad194db9eded3be89d2ec81e))
* **index:** export errorHelpers utilities at top level ([7192996](https://github.com/ironyh/VueSIP/commit/71929964585499f34b0331d19d0db4308d602483))
* **lint:** disable non-null assertion warning in useConnectionHealthBar test ([0f08b64](https://github.com/ironyh/VueSIP/commit/0f08b6449c43384a3e9d94d8c5c8e212ddab9a87))
* **lint:** remove @typescript-eslint/no-explicit-any warnings in useCallRecording.test.ts ([5db3e4b](https://github.com/ironyh/VueSIP/commit/5db3e4b33c9d81905cd1033a048e124b9a54ec17))
* **lint:** remove unused computed import in useCallQualityRecorder ([cdd21e7](https://github.com/ironyh/VueSIP/commit/cdd21e7d51241cbb4a61b3f1ed537b9654c477ca))
* **lint:** replace 'any' type casts with proper unknown types ([9a5a621](https://github.com/ironyh/VueSIP/commit/9a5a6210584e96199305d63952ff792a0e80236f))
* **lint:** replace any type with undefined in test type declaration ([c87d862](https://github.com/ironyh/VueSIP/commit/c87d86249b24c3c532d2927556ecfc44bf796517))
* **lint:** suppress explicit-any warnings in test files ([fc0870a](https://github.com/ironyh/VueSIP/commit/fc0870a1bf7cc7772e34bb96133492e5b3b47aca))
* make SIP_URI_REGEX case-insensitive ([30f8bb7](https://github.com/ironyh/VueSIP/commit/30f8bb7cc79d94faed84ffa557646dcd0d50cf2e))
* **performance:** bump MAX_BUNDLE_SIZE to 800KB ([e547f27](https://github.com/ironyh/VueSIP/commit/e547f2712befd949efcaca00140fde1fa89d15ed))
* **pwa-softphone:** add missing currentAccountConfigForQr computed prop ([2160cf0](https://github.com/ironyh/VueSIP/commit/2160cf0c0edfbce55eda67c634308f0fd773a48c))
* **pwa-softphone:** resolve build errors and add missing dependencies ([f5e3a5c](https://github.com/ironyh/VueSIP/commit/f5e3a5c90d6a4ac32d07af133da2b36cfe759d2a))
* **pwa-softphone:** resolve type issues in usePhone.ts media device handling ([22fc358](https://github.com/ironyh/VueSIP/commit/22fc3589cb5a9a664508358bf8e0f8501ba796bd))
* **pwa-softphone:** use props.accountConfig instead of undefined newConfig in QrProvisioning ([c5744ed](https://github.com/ironyh/VueSIP/commit/c5744ed3e15a0682591314e7bc992f087001098e))
* **quality:** remove unused imports and replace non-null assertions with type guards ([582c4d4](https://github.com/ironyh/VueSIP/commit/582c4d423ed880b0b1837d1329a496b3218ce07d))
* **qualityReport:** correct MOS calculation for packet loss ([b17d4b6](https://github.com/ironyh/VueSIP/commit/b17d4b6dddfc9f053e510f25daaa45fd3cb848e5))
* **qualityReport:** correct MOS formula coefficient from 7e-5 to 7e-6 ([7cea780](https://github.com/ironyh/VueSIP/commit/7cea780c738213b1ab34b94610aa8676be89538a))
* remove redundant env exports from utils/index.ts ([09be2c6](https://github.com/ironyh/VueSIP/commit/09be2c68792e99cf7bead76c4085e6d4fac8d35e))
* remove unnecessary 'as any' cast in useCredentialExpiry test ([cc17a18](https://github.com/ironyh/VueSIP/commit/cc17a186154934333063b8c1102456fe20af0473))
* remove unused imports in useMediaPermissions.test ([3454f8c](https://github.com/ironyh/VueSIP/commit/3454f8c69d4aa854c28425f622106a988d54d125))
* resolve @typescript-eslint/no-explicit-any warnings in sipUri.test.ts ([f4ce9bc](https://github.com/ironyh/VueSIP/commit/f4ce9bcb7691185e42471daf3949beec52af8d35))
* resolve duplicate TypeScript exports for QualityTrend and HistoryFilter ([5c1e31e](https://github.com/ironyh/VueSIP/commit/5c1e31ed5fd5394376eeae146bf06dff31d0c4cb))
* resolve lint errors - unused vars in test, remove unused reset in ConfirmDialog ([5ba516a](https://github.com/ironyh/VueSIP/commit/5ba516a66dc9539d2b0bb16e109929f18c028a2e))
* resolve lint warnings in callDiagnostics ([60ddeda](https://github.com/ironyh/VueSIP/commit/60ddeda7810a8c6f3cfc363f26cc7c2439ef3fad))
* resolve TypeScript readonly array errors and lint warning ([0a025f3](https://github.com/ironyh/VueSIP/commit/0a025f3604ccfedb30c5332ac2423dd8f184df78))
* resolve useCallQualityHistory test throttling issue ([cb5aa18](https://github.com/ironyh/VueSIP/commit/cb5aa18b5d22c4d161ad405c28925bfabd736efb))
* security vulnerabilities (undici + yauzl) ([ab8751f](https://github.com/ironyh/VueSIP/commit/ab8751f54bff0399e72f78bf2c114bb5c7ed821e))
* **test:** eliminate non-null assertions in sipUri tests ([87ac7c3](https://github.com/ironyh/VueSIP/commit/87ac7c3f6006ccde3d9d4bb9c795d35764dc4284))
* **test:** enable TypeScript type-checking in vitest ([3b36a0d](https://github.com/ironyh/VueSIP/commit/3b36a0db8cd72473561ecc9369d7257cf8f1e5fd))
* **testing:** waitForValue generates descriptive error messages on timeout ([a979d8d](https://github.com/ironyh/VueSIP/commit/a979d8d09277c70e6d8a49944b2eee15c49a3526))
* **test:** migrate vitest poolOptions to top-level config (Vitest 4+) ([b39eb59](https://github.com/ironyh/VueSIP/commit/b39eb59eb1895822ede10eec4e72dc88063f272e))
* **test:** relax event listener scaling threshold for CI environments ([58b211c](https://github.com/ironyh/VueSIP/commit/58b211c98754b506f89daaf56b94a03af7b89deb))
* **test:** remove any type cast in useMediaPermissions test ([074a9a1](https://github.com/ironyh/VueSIP/commit/074a9a19ae27557e748e83aa2706ce0a51cd6ab2))
* **test:** remove any type casts in useTranscription tests ([a991040](https://github.com/ironyh/VueSIP/commit/a991040c5a0036d57eafc760fdf8e8f30869bd51))
* **test:** remove duplicate iceConnectionState property in mock RTCPeerConnection ([9306644](https://github.com/ironyh/VueSIP/commit/9306644d9976f76173991739079cd21c046c6b0f))
* **test:** remove incorrect lastUpdated assertion in useCallQualityStats test ([75a2231](https://github.com/ironyh/VueSIP/commit/75a2231b6ee3434cdbf8f9d67adafc1871929333))
* **test:** remove non-null assertions in useAmiBase.test.ts ([e8230b2](https://github.com/ironyh/VueSIP/commit/e8230b232843b65ecf5434f858387c0cece1d99e))
* **test:** remove non-null assertions in useCallQualityScore tests ([80d1544](https://github.com/ironyh/VueSIP/commit/80d154451ee4f0eb313b452cb87db1e9bd302893))
* **test:** replace 'any' type casts with proper TestMockProvider type ([66da618](https://github.com/ironyh/VueSIP/commit/66da6189622d3225e24b4d6de586aaaece2fd824))
* **test:** replace 'as any' with proper type cast in usePresence test ([5c06edf](https://github.com/ironyh/VueSIP/commit/5c06edf143512f611615e3ebd93997a53baf86d5))
* **test:** replace any with unknown in mock RTCSession ([ae31613](https://github.com/ironyh/VueSIP/commit/ae31613f34451160f193a0d4b658276dd725e12e))
* **test:** replace explicit any with DTMFEvent type ([77ba56c](https://github.com/ironyh/VueSIP/commit/77ba56c67a48974dcfe2a519bc928c1cd37b1201))
* **test:** replace non-null assertions with optional chaining in voipms tests ([b0e85b7](https://github.com/ironyh/VueSIP/commit/b0e85b7073c63a2b2abcd02239e4c4c6c331b995))
* **test:** replace non-null assertions with type-safe helper in useMultiSipClient ([2127bc6](https://github.com/ironyh/VueSIP/commit/2127bc61a003d8f8042fb34c5236c49429bba8f0))
* **test:** replace unsafe 'any' casts with proper types in useDialStrategy tests ([e93fd48](https://github.com/ironyh/VueSIP/commit/e93fd487290426c7da38a1bdfb9eac507a0d067e))
* **test:** resolve TypeScript any lint warnings in useConnectionTest.test.ts ([d972bcf](https://github.com/ironyh/VueSIP/commit/d972bcfc8185b854c44253ca2ff91ce1461e8fbc))
* **tests:** add missing .value for ref comparisons in useMediaPermissions tests ([334a4b7](https://github.com/ironyh/VueSIP/commit/334a4b7f86a2138cc06e3efe88ae00f34bb2c5b6))
* **tests:** improve MediaManager ICE logging test mock factory ([2bc676b](https://github.com/ironyh/VueSIP/commit/2bc676b7b67146b29b241d953f170b7ec8d954c7))
* **test:** update clamp() test to match swapped bounds behavior ([3037605](https://github.com/ironyh/VueSIP/commit/30376059c6545bf18aa3d95e6bf144101ca0af9c))
* **test:** use Vue refs in ConfirmDialog test mock ([e52f057](https://github.com/ironyh/VueSIP/commit/e52f057a1fba8c9ab5f66c174884983508d31470))
* **types:** remove any type casts in useGracefulDegradation tests ([5dc5b08](https://github.com/ironyh/VueSIP/commit/5dc5b08b3fe09f377118cc5f3ebf5f5d4170aabf))
* **types:** replace any casts with proper types in useGracefulDegradation tests ([41589fa](https://github.com/ironyh/VueSIP/commit/41589fac0b2d9343e25d2c8e7d28cdb19bb5c1a8))
* **types:** resolve TypeScript strict null checks in callQualityHistory ([682078e](https://github.com/ironyh/VueSIP/commit/682078e633da9c925c39f5898bc93db8dad37b76))
* update pnpm-lock.yaml to resolve ERR_PNPM_LOCKFILE_CONFIG_MISMATCH ([bdf2303](https://github.com/ironyh/VueSIP/commit/bdf2303359b23b263f6f0a4e36d695e91da813b9))
* **use46ElksApi:** remove duplicate lines in clear() and add unit tests ([b5a04d5](https://github.com/ironyh/VueSIP/commit/b5a04d5fe3adc3c8587ab57b57b5dac3e80c948a))
* **useAmiCDR:** resolve 2 TypeCheckErrors (operator precedence) ([7e21d7c](https://github.com/ironyh/VueSIP/commit/7e21d7ca10e547a4a95002ec1b66517038467f7d))
* **useAmiCDR:** use ?? fallback for indexed access to satisfy noUncheckedIndexedAccess ([2e8f4fe](https://github.com/ironyh/VueSIP/commit/2e8f4fe0942bae94be8b9b5a775ee31499be6866))
* **useAmiCDR:** use explicit conditional instead of optional chaining in array index ([b6c8ced](https://github.com/ironyh/VueSIP/commit/b6c8ced038af199dc7ede517f45e13b9f9d9704a))
* **useAmiCDR:** use explicit if-branching for type narrowing ([ef510c2](https://github.com/ironyh/VueSIP/commit/ef510c25fe27db6070667fc692e54570fe71ed6f))
* **useAmiCDR:** use instanceof Date guard for explicit type narrowing ([e28e77c](https://github.com/ironyh/VueSIP/commit/e28e77c6f5f83713b66ec80f7ce223d9641c5658))
* **useCallQualityHistory:** replace non-null assertions with type casts ([8fcc655](https://github.com/ironyh/VueSIP/commit/8fcc6551403eb42d1df9a62a51c89fb22a5be47f))
* **useCallQualityStats:** replace any with DtmfSessionSource type ([25405ce](https://github.com/ironyh/VueSIP/commit/25405ce33731b7fe2f32b72ac0d8046ed7902b6c))
* **useCallQualityStats:** resolve TypeScript narrowing issues in stats collection ([ab5bd47](https://github.com/ironyh/VueSIP/commit/ab5bd47e70fe5493e1f883c8cf6437dc37d8f51f))
* **useConnectionTest:** change hardcoded Swedish strings to English ([25b8810](https://github.com/ironyh/VueSIP/commit/25b881030ec8405aeb7e0209f832ef5d10512a55))
* **useConnectionTest:** remove redundant dynamic import ([4a92907](https://github.com/ironyh/VueSIP/commit/4a929070cb28ec96949d96eb0009ac3cc88bac4e))
* **useGalleryLayout:** remove rows cap to prevent overflow for 17-24 participants ([86111e9](https://github.com/ironyh/VueSIP/commit/86111e9f9dbac18e22e3f910e58b6700067d0750))
* **useMessaging test:** replace any[] with MessagingEvent[] type annotations ([75e51da](https://github.com/ironyh/VueSIP/commit/75e51daa55052de9ece23380bef89e17a88f88b3))
* **usePushNotifications:** improve type safety with extended options and proper NotificationOptions cast ([0234118](https://github.com/ironyh/VueSIP/commit/02341184839722c7ea3242d87e71b7dbe2263076))
* **usePushNotifications:** replace any types with proper Service Worker types ([b6cfe70](https://github.com/ironyh/VueSIP/commit/b6cfe70daccfb150f5bb47738adbe0e22262e9b9))
* **useQualityAlerts:** add missing computed import ([054317f](https://github.com/ironyh/VueSIP/commit/054317f4cd919e627507ec2ccefff28d788d8b60))
* **useSentiment:** handle edge case when min &gt; max in clamp() ([2f9fa8b](https://github.com/ironyh/VueSIP/commit/2f9fa8bcd0043496fd004e8db5cd10da5f511b3a))
* **useTheme:** add SSR/non-browser environment guards ([670224a](https://github.com/ironyh/VueSIP/commit/670224aa7f5449a7987b2c0dd081d9f12a8fb731))
* **utils:** export missing callQualityHistory utilities ([f550783](https://github.com/ironyh/VueSIP/commit/f550783b1a8fc40b147fbc5c495457d217e44aed))
* **validators:** add missing isValid field to validatePhoneNumber ([5e8c60e](https://github.com/ironyh/VueSIP/commit/5e8c60ea55aa4cdc99c2ff528830a6d3ffea5843))
* **validators:** handle URLs without hostname in validateUrl ([f6ecb91](https://github.com/ironyh/VueSIP/commit/f6ecb91f428531fb9adaf717df89fb4d1a5d1375))
* **validators:** improve URL hostname validation error message ([accb0bd](https://github.com/ironyh/VueSIP/commit/accb0bde3cc1a0452088fe4195703db28e8d762b))
* **validators:** replace process.env.NODE_ENV with isProductionMode() ([d53f127](https://github.com/ironyh/VueSIP/commit/d53f1278ff43c00541129cb1e20c0e3510a4885d))
* **webrtc:** default STUN servers when rtcConfiguration not provided ([5a6f142](https://github.com/ironyh/VueSIP/commit/5a6f142a9c3cee82e0cc65778b51fbb9b686a3bc))


### Performance Improvements

* optimize breakoutAllCallers with concurrent requests ([3381ed4](https://github.com/ironyh/VueSIP/commit/3381ed4d58cc0509e30ad38c689884dfa5de29b7))
* optimize call history statistics calculation ([47da5b8](https://github.com/ironyh/VueSIP/commit/47da5b85af248f411f08e949c085279d4b28f143))

## [Unreleased]

### Added

- Comprehensive changelog with full version history
- Developer documentation structure
- **SIP Adapter Architecture** - Foundation for multi-library support (JsSIP, SIP.js, custom)
  - `ISipAdapter` interface - Adapter contract for SIP libraries
  - `ICallSession` interface - Standardized call session interface
  - `AdapterFactory` - Factory pattern for runtime library selection
  - Comprehensive adapter documentation (`/src/adapters/README.md`)
  - Implementation roadmap (`/ADAPTER_ROADMAP.md`)
  - Support for custom adapter implementations
- **Provider Abstraction System** - Multi-provider login with unified interface
  - Pre-configured provider settings for 46elks, Telnyx, VoIP.ms, Own PBX
  - `useProviderSelector` composable for reactive state management
  - Provider Registry for centralized provider lookup and registration
  - Credential Storage with localStorage/sessionStorage support
  - Provider Adapters for complex providers (Twilio) requiring custom logic
  - Full TypeScript type definitions with strongly-typed configurations
  - Comprehensive documentation (`/docs/guide/provider-selector.md`)
- **Telnyx API Service** - Integration with Telnyx REST API for advanced features
  - TelnyxApiLogin component for API-based authentication
  - Support for both SIP credentials and API-based workflows
- **Template Integration** - Provider system integrated in basic-softphone template
  - ProviderSelector and ProviderLoginForm components
  - Seamless provider switching in softphone UI

### Click-to-Call (Real SIP) — Added

- Real SIP support for Click-to-Call via adapter bridging `useSipClient` + `useCallSession`
- `UseSipAdapter` minimal interface to unify mock and real implementations (no unsafe casts)
- Inbound caller hydration: populate `remoteNumber` for ringing inbound calls in real SIP mode
- New unit tests for real SIP init path and inbound identity hydration
- Documentation: new Click-to-Call guide and example page
- Playground: new “Click-to-Call Widget (Browser SIP)” demo (mock by default, optional real SIP)
- Playground: cross-links between SIP widget and AMI agent-first demos for quick comparison

### Enterprise

- New `@vuesip/enterprise` package with analytics, compliance, and CRM modules
- CI workflow for enterprise pack checks

### AMI/Providers

- Templates: persist selected number/credential for 46elks/Telnyx API logins
- 46elks: add call history helpers and use proxy API base to avoid CORS

### Documentation

- Merged Examples sidebar with categorized pages and tutorial docs
- Added AI Insights demo page and unified transcription example links

### Chores

- Lint fixes across demos/tests; generated branch mergeability report at `.merge_report.txt`

### Changed

- Types: standardize `TypedEventBus` IDs to plain strings and centralize SIP event names into `SipEventNames` constants shared by producers/consumers; updated remaining usages in dialog and client; added migration notes in docs (VueSIP-g3g)
- Notifications: Add in-page incoming-call notifications (Phase 2) and optional Service Worker notifications with Answer/Decline actions behind feature flag (Phase 3); add NotificationManager (Phase 4) and docs/guide/notifications.md.

### Click-to-Call — Changed

- `onCallEnd` now fires for any termination (including missed/rejected/failed) with `duration = 0` when not answered
- Duration timer now driven by a single callState watcher for consistent start/stop behavior
- Playground defaults to the SIP Click-to-Call Widget example for faster discovery

## [1.0.0] - 2025-11-08

VueSip 1.0.0 is a complete, production-ready headless Vue.js component library for SIP/VoIP applications. This release represents the culmination of extensive development, testing, and documentation efforts across 11 major phases.

### Added

#### Core Infrastructure (Phases 1-4)

- **Project Foundation**: Complete TypeScript setup with Vite 5 build system
- **Type System**: Comprehensive TypeScript type definitions for SIP, calls, media, events, presence, messaging, and conferencing
- **Utility Layer**: Validators, formatters, logger, and constants
- **Event System**: Type-safe EventBus with wildcard listeners and async handler support
- **Transport Manager**: WebSocket management with automatic reconnection and exponential backoff
- **SIP Client**: Full JsSIP integration with UA lifecycle management and Digest authentication
- **Call Session Manager**: Complete call lifecycle management with state transitions and media handling
- **Media Manager**: WebRTC media management with device enumeration, ICE handling, and SDP negotiation

#### Composables (Phases 5-6)

- `useSipClient`: SIP connection and registration management
- `useSipRegistration`: SIP registration lifecycle control
- `useCallSession`: Call session management (make, answer, hold, mute, transfer)
- `useMediaDevices`: Media device enumeration and selection
- `useCallControls`: Call control operations (hold, mute, DTMF)
- `useCallHistory`: Call history tracking with filtering and export
- `useDTMF`: DTMF tone sending with queue management
- `usePresence`: SIP presence (SUBSCRIBE/NOTIFY) support
- `useMessaging`: SIP MESSAGE support for instant messaging
- `useConference`: Multi-party conference calling with participant management

#### State Management (Phase 5)

- `callStore`: Centralized call state management
- `deviceStore`: Media device state management
- `connectionStore`: SIP connection state management
- `presenceStore`: Presence state management
- Persistence system with localStorage and IndexedDB adapters
- Automatic state restoration on reload

#### Provider Components (Phase 6)

- `SipClientProvider`: Root-level SIP client management
- `ConfigProvider`: Configuration management with validation
- `MediaProvider`: Media device and permission management

#### Plugin System (Phase 7)

- `PluginManager`: Plugin lifecycle and registration
- `HookManager`: Hook system with priorities
- `AnalyticsPlugin`: Call analytics and event tracking
- `RecordingPlugin`: Call recording with MediaRecorder API and IndexedDB storage

#### Testing Infrastructure (Phases 8-10)

- 19 comprehensive unit test suites covering all utilities, core classes, composables, stores, plugins, and providers
- 584+ total unit tests with >80% code coverage
- 4 integration test suites with MockSipServer helper
- 45+ E2E tests with Playwright (cross-browser support)
- Parallel test execution configuration
- CI/CD-ready test infrastructure

#### Documentation (Phase 11.1-11.8)

- **Phase 11.1**: JSDoc/TSDoc documentation for `useConference` composable
- **Phase 11.4**: Complete plugin system documentation (PluginManager, HookManager, AnalyticsPlugin, RecordingPlugin)
- **Phase 11.5**: 11 comprehensive user guides covering:
  - Getting Started
  - Making Calls
  - Receiving Calls
  - Call Controls
  - Device Management
  - Call History
  - Presence and Messaging
  - Video Calling (with multi-party conferencing section)
  - Error Handling
  - Security Best Practices
  - Performance Optimization
- **Phase 11.6**: 5 production-ready example applications:
  - Basic Audio Call (~1,000 lines, 2 components)
  - Video Call (~2,500 lines, 4 components)
  - Multi-Line Phone (~2,200 lines, 4 components, supports 5 concurrent calls)
  - Conference Call (~1,331 lines, 5 components)
  - Call Center (~2,000 lines, 7 components, enterprise-grade)
  - Total: 64 files, ~9,031 lines of code, 22 components
- **Phase 11.7**: WCAG 2.1 Level AA accessibility improvements across all examples
- **Phase 11.8**: Developer documentation including comprehensive CHANGELOG

#### Features Highlights

- **Call Management**: Outgoing, incoming, hold, mute, transfer (blind and attended), DTMF
- **Media Handling**: Audio/video device enumeration, selection, permissions, stream management
- **Conference Calling**: Multi-party conferences with participant management, muting, audio levels
- **Call Recording**: MediaRecorder integration with IndexedDB storage
- **Call History**: Persistent call history with filtering, search, and CSV export
- **Presence**: SIP PUBLISH/SUBSCRIBE for user presence
- **Messaging**: SIP MESSAGE for instant messaging
- **Network Resilience**: Automatic reconnection, connection state management
- **Quality Management**: Automatic quality adjustment based on network conditions

### Changed

- **Breaking**: Renamed composables for consistency:
  - `useSipConnection` → `useSipClient`
  - `useSipCall` → `useCallSession`
  - `useSipDtmf` → `useDTMF`
  - `useAudioDevices` → `useMediaDevices`
- **Breaking**: Updated `useSipClient` API:
  - Must call `updateConfig()` before `connect()` (previously config was passed to `connect()`)
  - Added validation with `ValidationResult` return type
- **Breaking**: `useCallSession` now requires `sipClientRef` parameter
- **Breaking**: `useMediaDevices` method names:
  - `setAudioInput/Output` → `selectAudioInput/Output`
  - `selectedAudioInput` → `selectedAudioInputId`
- Improved TypeScript type safety across all modules (eliminated all 'any' types)
- Enhanced error handling with comprehensive try-catch blocks and user-friendly messages
- Improved call state transitions with proper event emission

### Fixed

- **Critical**: CallSession data exposure bug (toInterface() returned direct reference)
- **Critical**: CallSession duration calculation (added validation for negative durations)
- **Critical**: Media track duplication causing memory leaks
- **Critical**: Missing reject() method for incoming calls
- **Critical**: DTMF queue implementation (proper sequential sending with timing)
- **Critical**: 11 critical bugs in example applications (Phase 11.6 review)
- Fixed 200+ TypeScript errors through systematic improvements
- Fixed EventBus type alignment issues
- Fixed readonly config compatibility issues
- Fixed MediaDeviceKind type compatibility
- Fixed SipClient conference method stubs
- Fixed integration test timing and validation issues
- Fixed E2E test infrastructure for CI/CD compatibility

### Security

- Digest authentication (MD5) with 401/407 challenge handling
- Authorization username override support
- HA1 hash support for enhanced security
- Transport security (WSS/TLS) support
- Media encryption (DTLS-SRTP) via WebRTC
- Input validation for SIP URIs and phone numbers
- Credential storage best practices documentation

## [0.1.0] - 2025-11-05

### Added

- Initial prototype release of VueSip
- Basic SIP connection composable (`useSipConnection`)
- Basic call management (`useSipCall`)
- DTMF support (`useSipDtmf`)
- Audio device management (`useAudioDevices`)
- Example Dialpad and CallControls components
- TypeScript support
- MIT License

### Notes

- This version was a minimal prototype and is superseded by 1.0.0
- Breaking API changes were made between 0.1.0 and 1.0.0

[Unreleased]: https://github.com/ironyh/VueSip/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/ironyh/VueSip/releases/tag/v1.0.0
[0.1.0]: https://github.com/ironyh/VueSip/releases/tag/v0.1.0
