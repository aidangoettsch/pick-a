{
  description = "NYC Restaurant Week Explorer - find and filter restaurants, check availability";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    
    pyproject-nix = {
      url = "github:pyproject-nix/pyproject.nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    
    uv2nix = {
      url = "github:pyproject-nix/uv2nix";
      inputs.pyproject-nix.follows = "pyproject-nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    
    pyproject-build-systems = {
      url = "github:pyproject-nix/build-system-pkgs";
      inputs.pyproject-nix.follows = "pyproject-nix";
      inputs.uv2nix.follows = "uv2nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, flake-utils, pyproject-nix, uv2nix, pyproject-build-systems }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};

        # Load the uv workspace from uv.lock
        workspace = uv2nix.lib.workspace.loadWorkspace { workspaceRoot = ./.; };

        # Create package overlay from workspace
        overlay = workspace.mkPyprojectOverlay {
          sourcePreference = "wheel";
        };

        # Build Python package set
        python = pkgs.python313;
        
        pyprojectOverrides = _final: _prev: {
          # Add any package-specific overrides here if needed
        };

        pythonSet = (pkgs.callPackage pyproject-nix.build.packages {
          inherit python;
        }).overrideScope (
          pkgs.lib.composeManyExtensions [
            pyproject-build-systems.overlays.default
            overlay
            pyprojectOverrides
          ]
        );

        # Get the virtual environment with all dependencies
        venv = pythonSet.mkVirtualEnv "pick-a-env" workspace.deps.default;

        # Frontend build using pnpm
        frontend = pkgs.stdenv.mkDerivation {
          pname = "pick-a-frontend";
          version = "0.1.0";
          src = ./frontend;

          nativeBuildInputs = [
            pkgs.nodejs_22
            pkgs.pnpm
            pkgs.pnpmConfigHook
          ];

          pnpmDeps = pkgs.pnpm.fetchDeps {
            pname = "pick-a-frontend";
            version = "0.1.0";
            src = ./frontend;
            fetcherVersion = 1;
            hash = "sha256-5HNAHQ3J6BWPB+HAbe+dUSz7pD7AEwb5Q46KGOx0ij8="; # Replace after first build
          };

          buildPhase = ''
            runHook preBuild
            pnpm build
            runHook postBuild
          '';

          installPhase = ''
            runHook preInstall
            cp -r dist $out
            runHook postInstall
          '';
        };

        # Combined package with backend and frontend
        pick-a = pkgs.stdenv.mkDerivation {
          pname = "pick-a";
          version = "0.1.0";
          src = ./.;

          nativeBuildInputs = [ pkgs.makeWrapper ];
          buildInputs = [ venv ];

          dontBuild = true;

          installPhase = ''
            runHook preInstall

            mkdir -p $out/lib/pick-a
            mkdir -p $out/bin

            # Copy backend files
            cp server.py $out/lib/pick-a/
            cp check_availability.py $out/lib/pick-a/
            cp reservation_data.py $out/lib/pick-a/
            cp resy.py $out/lib/pick-a/
            cp opentable.py $out/lib/pick-a/
            cp restaurant_week_data.json $out/lib/pick-a/

            # Copy frontend build
            cp -r ${frontend} $out/lib/pick-a/static

            # Create wrapper script using venv's gunicorn
            makeWrapper ${venv}/bin/gunicorn $out/bin/pick-a-server \
              --chdir "$out/lib/pick-a" \
              --set PYTHONPATH "$out/lib/pick-a" \
              --set STATIC_FOLDER "$out/lib/pick-a/static" \
              --add-flags "-w 4 -b 0.0.0.0:\''${PORT:-5000} server:app"

            runHook postInstall
          '';
        };

      in {
        packages = {
          default = pick-a;
          inherit frontend pick-a venv;
        };

        # Development shell
        devShells.default = pkgs.mkShell {
          packages = [
            venv
            pkgs.nodejs_22
            pkgs.pnpm
            pkgs.uv
          ];
        };

        # NixOS module
        nixosModules.default = { config, lib, ... }:
          let
            cfg = config.services.pick-a;
          in {
            options.services.pick-a = {
              enable = lib.mkEnableOption "Pick-A Restaurant Week Explorer";

              port = lib.mkOption {
                type = lib.types.port;
                default = 5000;
                description = "Port to listen on";
              };

              openFirewall = lib.mkOption {
                type = lib.types.bool;
                default = false;
                description = "Open firewall for service port";
              };
            };

            config = lib.mkIf cfg.enable {
              systemd.services.pick-a = {
                description = "Pick-A Restaurant Week Explorer";
                wantedBy = [ "multi-user.target" ];
                after = [ "network.target" ];

                environment.PORT = toString cfg.port;

                serviceConfig = {
                  Type = "simple";
                  ExecStart = "${pick-a}/bin/pick-a-server";
                  Restart = "always";
                  RestartSec = "5s";
                  DynamicUser = true;
                };
              };

              networking.firewall.allowedTCPPorts = lib.mkIf cfg.openFirewall [ cfg.port ];
            };
          };
      }
    );
}
