import SwiftUI

struct LoginView: View {
    @Environment(AuthManager.self) private var auth

    var body: some View {
        VStack(spacing: 32) {
            Spacer()

            Image(systemName: "hammer.fill")
                .font(.system(size: 64))
                .foregroundStyle(.blue)

            Text("UDD Companion")
                .font(.largeTitle.bold())

            Text("Monitor runs, review previews,\nand collaborate on the go.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            Button {
                Task { await auth.signIn() }
            } label: {
                HStack(spacing: 8) {
                    if auth.isLoading {
                        ProgressView()
                            .tint(.white)
                    }
                    Text("Sign In")
                        .fontWeight(.semibold)
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(.blue)
                .foregroundStyle(.white)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .disabled(auth.isLoading)
            .padding(.horizontal, 40)

            if let error = auth.errorMessage {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(.red)
                    .padding(.horizontal, 40)
            }

            Spacer()
        }
    }
}
