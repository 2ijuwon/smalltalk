import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shelf/shelf.dart' as shelf;
import 'package:shelf/shelf_io.dart' as shelf_io;
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
  runApp(const EnglishApp());
}

class EnglishApp extends StatelessWidget {
  const EnglishApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      title: 'small talk',
      debugShowCheckedModeBanner: false,
      home: EnglishWebView(),
    );
  }
}

class EnglishWebView extends StatefulWidget {
  const EnglishWebView({super.key});

  @override
  State<EnglishWebView> createState() => _EnglishWebViewState();
}

class _EnglishWebViewState extends State<EnglishWebView> {
  static const _background = Color(0xFFEAF5FF);
  // Keep the WebView origin stable so localStorage survives app restarts.
  static const _localPort = 48123;
  static const _assets = <String, String>{
    '/': 'index.html',
    '/index.html': 'index.html',
    '/src/app.js': 'src/app.js',
    '/src/apple-slice.js': 'src/apple-slice.js',
    '/src/speech-clips.js': 'src/speech-clips.js',
    '/src/slime-dialogue.js': 'src/slime-dialogue.js',
    '/src/data.js': 'src/data.js',
    '/src/content.generated.js': 'src/content.generated.js',
    '/src/domain.js': 'src/domain.js',
    '/src/duel-motion.js': 'src/duel-motion.js',
    '/src/duel-rules.js': 'src/duel-rules.js',
    '/src/typing-game.js': 'src/typing-game.js',
    '/src/styles/pixel.css': 'src/styles/pixel.css',
    '/src/styles/font.css': 'src/styles/font.css',
    '/src/styles/Galmuri11.woff2': 'src/styles/Galmuri11.woff2',
    '/src/styles/Galmuri11-Bold.woff2': 'src/styles/Galmuri11-Bold.woff2',
  };

  static final _onlineUri = Uri.https('smalltalk-2ijuwon.vercel.app', '/');
  bool _usingLocal = false;
  bool _hasShownPage = false;
  Timer? _connectionTimer;
  HttpServer? _server;
  WebViewController? _controller;
  String? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _openSite();
  }

  Future<void> _openSite() async {
    try {
      final controller = WebViewController()
        ..setJavaScriptMode(JavaScriptMode.unrestricted)
        ..setBackgroundColor(_background)
        ..setNavigationDelegate(
          NavigationDelegate(
            onPageFinished: (url) {
              final host = Uri.tryParse(url)?.host;
              if (mounted &&
                  _error == null &&
                  host == (_usingLocal ? '127.0.0.1' : _onlineUri.host)) {
                _hasShownPage = true;
                setState(() => _loading = false);
                _watchConnection(_controller!);
              }
            },
            onWebResourceError: (error) {
              if (!mounted || error.isForMainFrame != true) return;
              if (!_usingLocal) {
                _openLocal(controller: _controller!);
              } else if (Uri.tryParse(error.url ?? '')?.host !=
                  _onlineUri.host) {
                _showError(error.description);
              }
            },
          ),
        );
      if (controller.platform case final AndroidWebViewController android) {
        await android.setMediaPlaybackRequiresUserGesture(false);
        await controller.addJavaScriptChannel(
          'SmalltalkMic',
          onMessageReceived: (_) => _recognizeSpeech(controller),
        );
        await controller.addJavaScriptChannel(
          'SmalltalkVolume',
          onMessageReceived: (message) =>
              _checkMediaVolume(controller, message.message),
        );
      }
      if (!mounted) return;
      setState(() => _controller = controller);
      if (await _siteAvailable()) {
        if (mounted) {
          await controller.loadRequest(_onlineUri);
          _watchConnection(controller);
        }
      } else if (mounted) {
        await _openLocal(controller: controller);
      }
    } catch (error) {
      if (mounted) _showError(error.toString());
    }
  }

  Future<bool> _siteAvailable() async {
    final client = HttpClient();
    try {
      return await (() async {
        final request = await client.headUrl(_onlineUri);
        final response = await request.close();
        return response.statusCode >= 200 && response.statusCode < 300;
      })().timeout(const Duration(seconds: 4));
    } catch (_) {
      return false;
    } finally {
      client.close(force: true);
    }
  }

  void _watchConnection(WebViewController controller) {
    _connectionTimer?.cancel();
    if (!mounted || _controller != controller) return;
    _connectionTimer = Timer(const Duration(seconds: 5), () async {
      final available = await _siteAvailable();
      if (!mounted || _controller != controller) return;
      if (!_loading && available == _usingLocal) {
        bool canSwitch = false;
        try {
          final result = await controller.runJavaScriptReturningResult(
            "document.documentElement.dataset.webviewSwitchSafe === 'true'",
          );
          canSwitch = result == true || result == 'true';
        } catch (_) {
          // Keep the current page if its state cannot be checked.
        }
        if (!mounted || _controller != controller) return;
        if (canSwitch) {
          if (available) {
            setState(() {
              _usingLocal = false;
              _loading = true;
            });
            try {
              await controller.loadRequest(
                _onlineUri.replace(queryParameters: {'resume': '1'}),
              );
            } catch (_) {
              if (mounted) await _openLocal(controller: controller);
            }
          } else {
            await _openLocal(controller: controller);
          }
        }
      }
      _watchConnection(controller);
    });
  }

  Future<void> _openLocal({required WebViewController controller}) async {
    if (_usingLocal) return;
    _connectionTimer?.cancel();
    setState(() {
      _usingLocal = true;
      _loading = true;
    });
    try {
      final server =
          _server ??
          await shelf_io.serve(
            _serveAsset,
            InternetAddress.loopbackIPv4,
            _localPort,
          );
      if (!mounted) {
        await server.close(force: true);
        return;
      }
      _server = server;
      await controller.loadRequest(
        Uri.http(
          '127.0.0.1:${server.port}',
          '/',
          _hasShownPage ? {'resume': '1'} : null,
        ),
      );
    } catch (error) {
      if (mounted) _showError(error.toString());
    }
  }

  void _showError(String description) {
    setState(() {
      _loading = false;
      _error = description;
    });
  }

  Future<bool> _isCurrentAppPage(WebViewController controller) async {
    final address = Uri.tryParse(await controller.currentUrl() ?? '');
    final trustedOrigin =
        address != null &&
        ((address.scheme == 'https' &&
                address.host == _onlineUri.host &&
                address.port == 443) ||
            (address.scheme == 'http' &&
                address.host == '127.0.0.1' &&
                address.port == _localPort));
    return mounted && _controller == controller && trustedOrigin;
  }

  Future<void> _checkMediaVolume(
    WebViewController controller,
    String message,
  ) async {
    final sequence = int.tryParse(message);
    if (sequence == null ||
        sequence < 1 ||
        !await _isCurrentAppPage(controller))
      return;
    try {
      final silent = await const MethodChannel(
        'smalltalk/speech',
      ).invokeMethod<bool>('isMediaSilent');
      if (silent == true && await _isCurrentAppPage(controller)) {
        await controller.runJavaScript(
          'window.receiveSmalltalkVolume?.($sequence, true);',
        );
      }
    } on PlatformException {
      // The hint is optional if the native audio service is unavailable.
    } on MissingPluginException {
      // A running build can lack the native volume method.
    }
  }

  Future<void> _recognizeSpeech(WebViewController controller) async {
    if (!await _isCurrentAppPage(controller)) return;
    String? transcript;
    try {
      transcript = await const MethodChannel(
        'smalltalk/speech',
      ).invokeMethod<String>('recognize');
    } on PlatformException {
      // The recognition activity can be unavailable on some devices.
    } on MissingPluginException {
      // Android registers the channel when the app is built.
    }
    if (!mounted || _controller != controller) return;
    await controller.runJavaScript(
      'window.receiveSmalltalkSpeech?.(${jsonEncode(transcript ?? '')});',
    );
  }

  Future<shelf.Response> _serveAsset(shelf.Request request) async {
    if (request.method != 'GET' && request.method != 'HEAD') {
      return shelf.Response(405);
    }
    final path = request.requestedUri.path;
    final file =
        _assets[path] ??
        (RegExp(r'^/src/audio/(?:[0-9]+|fx-[a-z]+)\.wav$').hasMatch(path)
            ? path.substring(1)
            : null);
    if (file == null) return shelf.Response.notFound('Not found');

    try {
      final data = await rootBundle.load('assets/www/$file');
      final bytes = data.buffer.asUint8List(
        data.offsetInBytes,
        data.lengthInBytes,
      );
      final contentType = switch (file.split('.').last) {
        'html' => 'text/html; charset=utf-8',
        'css' => 'text/css; charset=utf-8',
        'js' => 'text/javascript; charset=utf-8',
        'woff2' => 'font/woff2',
        'wav' => 'audio/wav',
        _ => 'application/octet-stream',
      };
      return shelf.Response.ok(
        request.method == 'HEAD' ? null : bytes,
        headers: {
          HttpHeaders.contentTypeHeader: contentType,
          HttpHeaders.cacheControlHeader: 'no-store',
        },
      );
    } catch (_) {
      return shelf.Response.notFound('Asset not found: $path');
    }
  }

  @override
  void dispose() {
    _connectionTimer?.cancel();
    _server?.close(force: true);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _background,
      body: SafeArea(
        child: Column(
          children: [
            if (_usingLocal && !_loading && _error == null)
              Align(
                alignment: Alignment.centerRight,
                child: Padding(
                  padding: const EdgeInsets.only(right: 12, bottom: 2),
                  child: Semantics(
                    label: '오프라인 모드',
                    child: const CustomPaint(
                      size: Size(20, 16),
                      painter: _OfflineWifiPainter(),
                    ),
                  ),
                ),
              ),
            Expanded(
              child: Stack(
                children: [
                  if (_controller case final controller?)
                    WebViewWidget(controller: controller),
                  if (_loading)
                    const Center(child: CircularProgressIndicator()),
                  if (_error case final error?)
                    Center(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Text('화면을 불러오지 못했습니다.'),
                            const SizedBox(height: 8),
                            Text(error, textAlign: TextAlign.center),
                            const SizedBox(height: 16),
                            FilledButton(
                              onPressed: () {
                                setState(() {
                                  _error = null;
                                  _loading = true;
                                });
                                _usingLocal = false;
                                _openSite();
                              },
                              child: const Text('다시 시도'),
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _OfflineWifiPainter extends CustomPainter {
  const _OfflineWifiPainter();

  static const _pixels = [
    'XX.####...',
    '.XX....##.',
    '..XX##....',
    '...XX.##..',
    '....XX....',
    '.....XX...',
    '....#.XX..',
  ];

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = const Color(0xFFC32D42);
    final unit = size.width / 10;
    for (var y = 0; y < _pixels.length; y++) {
      for (var x = 0; x < _pixels[y].length; x++) {
        if (_pixels[y][x] == '.') continue;
        canvas.drawRect(Rect.fromLTWH(x * unit, y * unit, unit, unit), paint);
      }
    }
  }

  @override
  bool shouldRepaint(_OfflineWifiPainter oldDelegate) => false;
}
