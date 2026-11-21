import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('bundled web app has its entry point and JavaScript modules', () async {
    final html = await rootBundle.loadString('assets/www/index.html');
    const files = [
      'src/app.js',
      'src/ui.js',
      'src/orchard.js',
      'src/typing-arcade.js',
      'src/conversation.js',
      'src/speech.js',
      'src/effects.js',
      'src/layout-motion.js',
      'src/word-search.js',
      'src/data.js',
      'src/domain.js',
      'src/duel-motion.js',
      'src/duel-rules.js',
      'src/typing-game.js',
      'src/styles/pixel.css',
      'src/styles/font.css',
      'src/styles/Galmuri11.woff2',
      'src/styles/Galmuri11-Bold.woff2',
    ];
    for (final file in files) {
      final data = await rootBundle.load('assets/www/$file');
      expect(data.lengthInBytes, greaterThan(0), reason: file);
    }

    expect(html, contains('./src/app.js'));
    expect(html, contains('./src/styles/font.css'));
  });
}
