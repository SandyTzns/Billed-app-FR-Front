/**
 * @jest-environment jsdom
 */

import { screen, waitFor } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import BillsUI from "../views/BillsUI.js";
import Bills from "../containers/Bills.js";
import { bills } from "../fixtures/bills.js";
import { ROUTES, ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store";

import router from "../app/Router.js";

jest.mock("../app/store", () => mockStore);

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    test("Then bill icon in vertical layout should be highlighted", async () => {
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
        })
      );
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
      window.onNavigate(ROUTES_PATH.Bills);
      await waitFor(() => screen.getByTestId("icon-window"));
      const windowIcon = screen.getByTestId("icon-window");
      //to-do write expect expression
      expect(windowIcon.classList).toContain("active-icon");
    });

    test("Then bills should be ordered from earliest to latest", () => {
      document.body.innerHTML = BillsUI({ data: bills });
      const dates = screen
        .getAllByText(
          /^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i
        )
        .map((a) => a.innerHTML);

      const antiChrono = (a, b) => (a < b ? 1 : -1);
      const datesSorted = [...dates].sort(antiChrono);
      expect(dates).toEqual(datesSorted);
    });

    test("If there is at least one bill then it should be shown .", () => {
      document.body.innerHTML = BillsUI({ data: bills });
      const iconEyes = screen.getAllByTestId("icon-eye");
      // Au moins une icone "Visualiser" est présente sur la page ?
      expect(iconEyes.length).toBeGreaterThanOrEqual(1);
    });

    test("Then no bills should be shown if they are no bills.", () => {
      document.body.innerHTML = BillsUI({ data: [] });
      const iconEye = screen.queryByTestId("icon-eye");
      // Aucune icone "Visualiser" n'est présente sur la page?
      expect(iconEye).toBeNull();
    });

    // *******************************************************

    describe('When I click on the "New Bill" button', () => {
      test("Then the New Bill page should appear", async () => {
        const onNavigate = (pathname) => {
          document.body.innerHTML = ROUTES({ pathname });
        };

        const bills = new Bills({
          document,
          onNavigate,
          store: null,
          localStorage: null,
        });

        // ----- Création des eventListener sur la bill de test ----- //
        const handleClickNewBill = jest.fn((e) => bills.handleClickNewBill(e));
        const buttonNewBill = screen.getByTestId("btn-new-bill");
        buttonNewBill.addEventListener("click", handleClickNewBill);

        // ----- Simulation de l'action 'clique' d'un utilisateur ----- //
        userEvent.click(buttonNewBill);

        const formNewBill = screen.getByTestId("form-new-bill");

        // La fonction handleClickNewbill a été appelée?
        expect(handleClickNewBill).toHaveBeenCalled();
        // Le menu New Bill est affiché?
        expect(formNewBill).toBeTruthy();
      });
    });

    // *******************************************************
    describe("When I click on the eye icon of the bill", () => {
      test("then it should open the bill in a new modal", () => {
        $.fn.modal = jest.fn();
        document.body.innerHTML = BillsUI({ data: bills });

        const onNavigate = (pathname) => {
          document.body.innerHTML = ROUTES({ pathname });
        };

        const testingBills = new Bills({
          document,
          onNavigate,
          store: null,
          localStorage: null,
        });
        // ----- Création d'event Listener  ----- //
        const iconEyes = screen.getAllByTestId("icon-eye");
        const handleClickIconEye = jest.fn(
          testingBills.handleClickIconEye(iconEyes[0])
        );

        iconEyes[0].addEventListener("click", handleClickIconEye);
        // -----  Simulation du clique utilisateur ----- //
        userEvent.click(iconEyes[0]);
        // La fonction handleClickIconEye a--t-elle été appelée?
        expect(handleClickIconEye).toHaveBeenCalled();
        // La modale est dans le DOM?
        const modalTarget = screen.getByTestId("modal");
        expect(modalTarget).toBeTruthy();
      });

      // *******************************************************
      test("Then a modal with the bill's file should be open", () => {
        $.fn.modal = jest.fn();
        document.body.innerHTML = BillsUI({ data: bills });

        const onNavigate = (pathname) => {
          document.body.innerHTML = ROUTES({ pathname });
        };
        // ----- Bill de test ----- //
        const testingBills = new Bills({
          document,
          onNavigate,
          store: null,
          localStorage: null,
        });
      });

      // *************************************************
    });
    // *************************************************
    describe("Given I am a user connected as Employee", () => {
      describe("When I navigate to Bills", () => {
        test("fetches bills from mock API GET", async () => {
          localStorage.setItem(
            "user",
            JSON.stringify({ type: "Employee", email: "a@a" })
          );
          const root = document.createElement("div");
          root.setAttribute("id", "root");
          document.body.append(root);
          router();
          window.onNavigate(ROUTES_PATH.Bills);
          await waitFor(() => screen.getByText("Mes notes de frais"));
          const databody = screen.getByTestId("tbody");
          // Au moins une bill a été récupérée ?
          expect(databody.childElementCount).toBeGreaterThan(1);
        });
      });
    });
    // *************************************************

    describe("When an error occurs on API", () => {
      beforeEach(() => {
        jest.spyOn(mockStore, "bills");
        Object.defineProperty(window, "localStorage", {
          value: localStorageMock,
        });
        window.localStorage.setItem(
          "user",
          JSON.stringify({
            type: "Employee",
            email: "a@a",
          })
        );
        const root = document.createElement("div");
        root.setAttribute("id", "root");
        document.body.appendChild(root);
        router();
      });
      test("fetches bills from an API and fails with an error", async () => {
        mockStore.bills.mockImplementationOnce(() => {
          return {
            list: () => {
              return Promise.reject(new Error("Erreur"));
            },
          };
        });
        window.onNavigate(ROUTES_PATH.Bills);
        await new Promise(process.nextTick);
        const databody = await screen.getByTestId("tbody");
        // si ça renvoit une erreur 404 alors on ne retourne pas une liste de bills ?
        expect(databody).toBeNull;
      });

      test("fetches bills from an API and fails with 404 message error", async () => {
        mockStore.bills.mockImplementationOnce(() => {
          return {
            list: () => {
              return Promise.reject(new Error("Erreur 404"));
            },
          };
        });
        window.onNavigate(ROUTES_PATH.Dashboard);
        await new Promise(process.nextTick);
        const message = await screen.getByText(/Erreur 404/);
        expect(message).toBeTruthy();
      });

      test("fetches messages from an API and fails with 500 message error", async () => {
        mockStore.bills.mockImplementationOnce(() => {
          return {
            list: () => {
              return Promise.reject(new Error("Erreur 500"));
            },
          };
        });

        window.onNavigate(ROUTES_PATH.Dashboard);
        await new Promise(process.nextTick);
        const message = await screen.getByText(/Erreur 500/);
        expect(message).toBeTruthy();
      });
    });
  });
});
