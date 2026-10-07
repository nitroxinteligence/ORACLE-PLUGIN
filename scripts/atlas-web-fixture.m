// Standalone synthetic WKWebView host. No Oracle/Core, credentials or real bridge.
// Built by test-integrated-web-native.py into the worker's disposable scratch only.
#import <AppKit/AppKit.h>
#import <WebKit/WebKit.h>

@interface OracleWebFixture : NSObject <WKScriptMessageHandler, WKNavigationDelegate>
@property(nonatomic, strong) WKWebView *web;
@property(nonatomic, strong) NSWindow *window;
@property(nonatomic, copy) NSString *reportPath;
@property(nonatomic, copy) NSString *assetPath;
@property(nonatomic) BOOL finished;
- (void)finish:(NSDictionary *)result;
@end

@implementation OracleWebFixture
- (void)finish:(NSDictionary *)result {
    if (self.finished) return;
    self.finished = YES;
    NSError *error = nil;
    NSData *json = [NSJSONSerialization dataWithJSONObject:result options:NSJSONWritingPrettyPrinted | NSJSONWritingSortedKeys error:&error];
    // Foundation atomic writes may stage under a system item-replacement path.
    // Keep this disposable test report strictly inside the allowed scratch path.
    FILE *output = json ? fopen(self.reportPath.UTF8String, "wb") : NULL;
    BOOL saved = output && fwrite(json.bytes, 1, json.length, output) == json.length;
    if (output) fclose(output);
    fprintf(stdout, "FIXTURE_DONE %s\n", saved ? "report saved" : "report write rejected");
    fflush(stdout);
    [self.web stopLoading];
    [self.web.configuration.userContentController removeScriptMessageHandlerForName:@"oracle"];
    [self.web.configuration.userContentController removeScriptMessageHandlerForName:@"fixture"];
    [self.window orderOut:nil];
    int status = saved && [result[@"failed"] intValue] == 0 && [result[@"passed"] intValue] > 0 ? 0 : 1;
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.1 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{ exit(status); });
}
- (void)userContentController:(WKUserContentController *)controller didReceiveScriptMessage:(WKScriptMessage *)message {
    if (self.finished || ![message.body isKindOfClass:NSDictionary.class]) return;
    NSDictionary *body = message.body;
    if ([message.name isEqualToString:@"oracle"]) {
        NSData *json = [NSJSONSerialization dataWithJSONObject:body options:0 error:nil];
        NSString *payload = [[NSString alloc] initWithData:json encoding:NSUTF8StringEncoding];
        [self.web evaluateJavaScript:[NSString stringWithFormat:@"void window.__oracleFixtureReceive(%@)", payload] completionHandler:^(id result, NSError *error) {
            if (error) [self finish:@{@"passed":@0, @"failed":@1, @"error":error.localizedDescription, @"stage":@"mock bridge"}];
        }];
        return;
    }
    if ([body[@"type"] isEqual:@"case"]) {
        NSData *json = [NSJSONSerialization dataWithJSONObject:body options:0 error:nil];
        fwrite(json.bytes, 1, json.length, stdout); fputc('\n', stdout); fflush(stdout);
    } else if ([body[@"type"] isEqual:@"done"]) {
        [self finish:body];
    }
}
- (void)webView:(WKWebView *)webView didFinishNavigation:(WKNavigation *)navigation {
    [webView evaluateJavaScript:@"void window.__oracleFixtureRun()" completionHandler:^(id result, NSError *error) {
        if (error) [self finish:@{@"passed":@0, @"failed":@1, @"error":error.localizedDescription, @"stage":@"test startup"}];
    }];
}
- (void)webView:(WKWebView *)webView didFailProvisionalNavigation:(WKNavigation *)navigation withError:(NSError *)error {
    [self finish:@{@"passed":@0, @"failed":@1, @"error":error.localizedDescription, @"stage":@"file load"}];
}
- (void)webViewWebContentProcessDidTerminate:(WKWebView *)webView {
    [self finish:@{@"passed":@0, @"failed":@1, @"error":@"Synthetic WebContent process terminated"}];
}
- (void)webView:(WKWebView *)webView decidePolicyForNavigationAction:(WKNavigationAction *)action decisionHandler:(void (^)(WKNavigationActionPolicy))decisionHandler {
    NSURL *url = action.request.URL;
    BOOL allowed = url.isFileURL && [url.path hasPrefix:[self.assetPath stringByAppendingString:@"/"]];
    decisionHandler(allowed ? WKNavigationActionPolicyAllow : WKNavigationActionPolicyCancel);
}
@end

int main(int argc, const char **argv) {
    @autoreleasepool {
        if (argc != 4) { fprintf(stderr, "usage: atlas-web-fixture ASSET_DIR TEST_JS REPORT_JSON\n"); return 2; }
        OracleWebFixture *host = [OracleWebFixture new];
        host.assetPath = [NSString stringWithUTF8String:argv[1]];
        host.reportPath = [NSString stringWithUTF8String:argv[3]];
        NSError *error = nil;
        NSString *script = [NSString stringWithContentsOfFile:[NSString stringWithUTF8String:argv[2]] encoding:NSUTF8StringEncoding error:&error];
        if (!script) { fprintf(stderr, "%s\n", error.localizedDescription.UTF8String); return 2; }
        [NSApplication sharedApplication];
        [NSApp setActivationPolicy:NSApplicationActivationPolicyAccessory];
        WKWebViewConfiguration *configuration = [WKWebViewConfiguration new];
        configuration.websiteDataStore = WKWebsiteDataStore.nonPersistentDataStore;
        configuration.preferences.javaScriptCanOpenWindowsAutomatically = NO;
        [configuration.userContentController addScriptMessageHandler:host name:@"oracle"];
        [configuration.userContentController addScriptMessageHandler:host name:@"fixture"];
        [configuration.userContentController addUserScript:[[WKUserScript alloc] initWithSource:script injectionTime:WKUserScriptInjectionTimeAtDocumentStart forMainFrameOnly:YES]];
        host.web = [[WKWebView alloc] initWithFrame:NSMakeRect(0, 0, 1280, 820) configuration:configuration];
        host.web.navigationDelegate = host;
        host.window = [[NSWindow alloc] initWithContentRect:NSMakeRect(30, 30, 1280, 820) styleMask:NSWindowStyleMaskTitled | NSWindowStyleMaskClosable backing:NSBackingStoreBuffered defer:NO];
        host.window.releasedWhenClosed = NO;
        host.window.title = @"Oracle — synthetic UI validation (no personal data)";
        host.window.contentView = host.web;
        [host.window orderFront:nil];
        NSURL *assets = [NSURL fileURLWithPath:host.assetPath isDirectory:YES];
        [host.web loadFileURL:[assets URLByAppendingPathComponent:@"index.html"] allowingReadAccessToURL:assets];
        dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(75 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
            [host finish:@{@"passed":@0, @"failed":@1, @"error":@"Native fixture deadline exceeded (75 seconds)"}];
        });
        [NSApp run];
    }
    return 2;
}
