import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shelf/shelf.dart' as shelf;
import 'package:shelf/shelf_io.dart' as shelf_io;
import 'package:webview_flutter/webview_flutter.dart';

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
    '/src/data.js': 'src/data.js',
    '/src/domain.js': 'src/domain.js',
    '/src/duel-motion.js': 'src/duel-motion.js',
    '/src/duel-rules.js': 'src/duel-rules.js',
    '/src/typing-game.js': 'src/typing-game.js',
    '/src/styles/pixel.css': 'src/styles/pixel.css',
    '/src/styles/font.css': 'src/styles/font.css',
    '/src/styles/Galmuri11.woff2': 'src/styles/Galmuri11.woff2',
    '/src/styles/Galmuri11-Bold.woff2': 'src/styles/Galmuri11-Bold.woff2',
  };

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
      final server = await shelf_io.serve(
        _serveAsset,
        InternetAddress.loopbackIPv4,
        _localPort,
      );
      if (!mounted) {
        await server.close(force: true);
        return;
      }
      _server = server;
      final controller = WebViewController()
        ..setJavaScriptMode(JavaScriptMode.unrestricted)
        ..setBackgroundColor(_background)
        ..setNavigationDelegate(
          NavigationDelegate(
            onPageFinished: (_) {
              if (mounted) setState(() => _loading = false);
            },
            onWebResourceError: (error) {
              if (mounted && error.isForMainFrame == true) {
                setState(() {
                  _loading = false;
                  _error = error.description;
                });
              }
            },
          ),
        );
      setState(() => _controller = controller);
      await controller.loadRequest(
        Uri.parse('http://127.0.0.1:${server.port}/'),
      );
    } catch (error) {
      if (mounted) {
        setState(() {
          _loading = false;
          _error = error.toString();
        });
      }
    }
  }

  Future<shelf.Response> _serveAsset(shelf.Request request) async {
    if (request.method != 'GET' && request.method != 'HEAD') {
      return shelf.Response(405);
    }
    final path = request.requestedUri.path;
    final file = _assets[path];
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
    _server?.close(force: true);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _background,
      body: SafeArea(
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
                          _controller?.reload();
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
    );
  }
}
